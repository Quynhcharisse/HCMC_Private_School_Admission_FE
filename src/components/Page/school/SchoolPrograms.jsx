import React, { useEffect, useMemo, useRef, useState } from "react";
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
    Grow,
    IconButton,
    InputAdornment,
    MenuItem,
    Skeleton,
    CircularProgress,
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
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import PowerSettingsNewRoundedIcon from "@mui/icons-material/PowerSettingsNewRounded";
import SchoolIcon from "@mui/icons-material/School";
import SearchIcon from "@mui/icons-material/Search";
import VerifiedIcon from "@mui/icons-material/Verified";

import { enqueueSnackbar } from "notistack";

import { useSchool } from "../../../contexts/SchoolContext.jsx";
import { getCurriculumList } from "../../../services/CurriculumService.jsx";
import { cloneProgram, getProgramList, handleProgramAction, saveProgram } from "../../../services/ProgramService.jsx";

const modalPaperSx = {
    borderRadius: "16px",
    boxShadow: "0 24px 48px rgba(0, 0, 0, 0.12)",
    bgcolor: "white",
    overflow: "hidden",
    position: "relative",
};

const modalBackdropSx = {
    backdropFilter: "blur(6px)",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
};

const PROGRAM_STATUS_OPTIONS = [
    { value: "all", label: "Tất cả" },
    { value: "PRO_DRAFT", label: "Nháp" },
    { value: "PRO_ACTIVE", label: "Hoạt động" },
    { value: "PRO_INACTIVE", label: "Không hoạt động" },
];

const LANGUAGE_OPTIONS = [
    { value: "VIETNAMESE", label: "Tiếng Việt" },
    { value: "ENGLISH", label: "Tiếng Anh" },
    { value: "BILINGUAL", label: "Song ngữ" },
    { value: "FRENCH", label: "Tiếng Pháp" },
    { value: "JAPANESE", label: "Tiếng Nhật" },
    { value: "CHINESE", label: "Tiếng Trung" },
    { value: "KOREAN", label: "Tiếng Hàn" },
    { value: "GERMAN", label: "Tiếng Đức" },
];

const FEE_UNIT_OPTIONS = [
    { value: "YEAR", label: "Theo năm" },
    { value: "SEMESTER", label: "Theo học kỳ" },
    { value: "QUARTER", label: "Theo quý" },
    { value: "MONTH", label: "Theo tháng" },
];

const CURRICULUM_TYPE_OPTIONS = ["INTEGRATED", "NATIONAL", "INTERNATIONAL"];

const curriculumTypeI18N = {
    NATIONAL: "Quốc gia",
    INTERNATIONAL: "Quốc tế",
    INTEGRATED: "Tích hợp",
};

const normalizeStatus = (status) => String(status || "").toUpperCase();

const toCurriculumTypeLabel = (value) => curriculumTypeI18N[value] ?? value ?? "—";
const getEnumLabel = (options, value) => {
    const v = safeString(value).trim();
    if (!v) return "—";
    return options.find((o) => String(o.value).toUpperCase() === String(v).toUpperCase())?.label ?? v;
};
const getEnumListLabel = (options, values) => {
    const list = Array.isArray(values) ? values : [];
    const labels = list.map((value) => getEnumLabel(options, value)).filter((label) => label && label !== "—");
    return labels.length > 0 ? labels.join(", ") : "—";
};

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
        id: item.id ?? item.curriculumId ?? item.curriculumID ?? item.curriculum_id ?? null,
        subTypeName: mapSubTypeNameForProgramSelect(item),
        curriculumType: item.curriculumType ?? item.type ?? "",
        enrollmentYear: item.enrollmentYear ?? item.year ?? item.enrollment_year ?? "",
        curriculumStatus: item.curriculumStatus ?? item.status ?? item.curriculum_status,
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
const MAX_PROGRAM_NAME_LEN = 100;
const createEmptyExtraSubject = () => ({ name: "", description: "", isMandatory: false });

function tuitionFeeToDigitString(value) {
    if (value === "" || value == null) return "";
    const n = Math.trunc(Number(value));
    if (!Number.isFinite(n) || n < 0) return "";
    return String(n);
}

function mapProgramFromApi(item) {
    if (!item) return null;

    const statusRaw = item.status ?? item.programStatus ?? item.program_status ?? item.programStatusRaw;
    const status = normalizeStatus(statusRaw);

    const isActiveBool = (() => {
        if (typeof item.isActive === "boolean") return item.isActive;
        if (typeof item.isActiveBool === "boolean") return item.isActiveBool;
        return status === "PRO_ACTIVE";
    })();

    const curriculum = item.curriculum ?? {};
    const subjects = Array.isArray(item.subjects) ? item.subjects : [];
    const extraSubjectList = subjects
        .filter((s) => String(s?.origin || "").toUpperCase() === "EXTRA")
        .map((s) => ({
            name: s?.name ?? "",
            description: s?.description ?? "",
            isMandatory: !!s?.isMandatory,
        }));

    return {
        id: item.id,
        name: item.name != null ? String(item.name) : "",
        curriculumId: item.curriculumId ?? item.curriculumID ?? item.curriculum_id ?? curriculum?.id ?? curriculum?.Id ?? null,
        curriculumName: item.curriculumName ?? curriculum?.name ?? curriculum?.subTypeName ?? "",
        enrollmentYear: item.enrollmentYear ?? curriculum?.enrollmentYear ?? "",
        curriculumType: item.curriculumType ?? curriculum?.type ?? "",
        curriculumStatus: item.curriculumStatus ?? curriculum?.status ?? "",

        status,
        languageOfInstructionList: Array.isArray(item.languageOfInstructionList)
            ? item.languageOfInstructionList.filter(Boolean)
            : item.languageOfInstruction
              ? [item.languageOfInstruction]
              : [],
        feeUnit: item.feeUnit ?? item.fee_unit ?? "",

        baseTuitionFee: Number(item.baseTuitionFee ?? 0),
        targetStudentDescription: item.targetStudentDescription ?? item.target_student_description ?? "",
        graduationStandard: item.graduationStandard ?? item.graduation_standard ?? "",
        extraSubjectList,

        offeringCount: Number(item.offeringCount ?? 0),
        effectiveOfferingCount: Number(item.effectiveOfferingCount ?? 0),
        canEditCore: typeof item.canEditCore === "boolean" ? item.canEditCore : true,

        isActiveBool,
        schoolId: item.schoolId ?? curriculum?.schoolId ?? null,
        createdAt: item.createdAt ?? item.created_at ?? item.createdTime ?? item.created_time ?? item.created_date ?? null,
    };
}

function toEpoch(value) {
    if (!value) return null;
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : null;
}

function getProgramStatusMeta(status, isActiveBool) {
    const s = normalizeStatus(status);
    if (s === "PRO_ACTIVE") return { label: "Hoạt động", bg: "rgba(34, 197, 94, 0.12)", color: "#16a34a" };
    if (s === "PRO_INACTIVE") return { label: "Không hoạt động", bg: "rgba(148, 163, 184, 0.2)", color: "#64748b" };
    if (s === "PRO_DRAFT") return { label: "Nháp", bg: "rgba(234, 179, 8, 0.14)", color: "#b45309" };
    if (isActiveBool) return { label: "Hoạt động", bg: "rgba(34, 197, 94, 0.12)", color: "#16a34a" };
    return { label: "Không hoạt động", bg: "rgba(148, 163, 184, 0.2)", color: "#64748b" };
}

function ProgramStatusBadge({ status, isActiveBool }) {
    const meta = getProgramStatusMeta(status, isActiveBool);
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

/** Đồng bộ với ProgramValidation.normalize(String) trên BE. */
function normalizeField(value) {
    if (value == null) return null;
    const trimmed = String(value).trim();
    return trimmed === "" ? null : trimmed;
}

const LANGUAGE_INSTRUCTION_VALUES = LANGUAGE_OPTIONS.map((o) => String(o.value).toUpperCase());
const FEE_UNIT_VALUES = FEE_UNIT_OPTIONS.map((o) => String(o.value).toUpperCase());

function isValidLanguageOfInstruction(lang) {
    if (lang == null) return false;
    const s = String(lang).trim();
    if (!s) return false;
    return LANGUAGE_INSTRUCTION_VALUES.some((v) => v === s.toUpperCase());
}

function isValidFeeUnit(feeUnit) {
    if (feeUnit == null) return false;
    const s = String(feeUnit).trim();
    if (!s) return false;
    return FEE_UNIT_VALUES.some((v) => v === s.toUpperCase());
}

function mapProgramBackendMessageToVi(message) {
    const msg = String(message ?? "").trim();
    if (!msg) return "";

    const map = {
        "Request is required": "Yêu cầu là bắt buộc.",
        "Curriculum ID is not found": "Không tìm thấy Curriculum.",
        "Curriculum is invalid": "Curriculum không hợp lệ.",
        "Cannot use an archived curriculum. Please use the latest active version.":
            "Không thể dùng Curriculum đã lưu trữ. Vui lòng chọn phiên bản hoạt động (CUR_ACTIVE) mới nhất.",
        "Name is required": "Tên chương trình là bắt buộc.",
        "Name exceeds 100 characters": "Tên vượt quá 100 ký tự.",
        "Graduation standard is required": "Chuẩn đầu ra là bắt buộc.",
        "Graduation standard exceeds 2000 characters": "Chuẩn đầu ra vượt quá 2000 ký tự.",
        "Target student description is required": "Mô tả đối tượng học sinh là bắt buộc.",
        "Target student description exceeds 2000 characters": "Mô tả đối tượng học sinh vượt quá 2000 ký tự.",
        "Tuition fee is required": "Học phí gốc là bắt buộc.",
        "Tuition fee cannot be negative": "Học phí gốc không được là số âm.",
        "Fee unit is required": "Đơn vị học phí là bắt buộc.",
        "Program not found in your school scope": "Không tìm thấy Program trong phạm vi trường của bạn.",
        "Cannot change curriculum of an ACTIVE program.":
            "Không thể thay đổi khung chương trình của chương trình đang hoạt động.",
        "Cannot change tuition fee or fee unit of an ACTIVE program. Please close this and create a new program.":
            "Không thể thay đổi học phí gốc hoặc đơn vị học phí của chương trình đang hoạt động. Vui lòng tạm dừng và tạo chương trình mới.",
        "Cannot change curriculum because this program has active offerings/enrollments.":
            "Không thể thay đổi khung chương trình vì chương trình đã có đợt tuyển sinh/ghi danh đang hoạt động.",
        "Graduation standard already exists in this curriculum": "Chuẩn đầu ra đã tồn tại trong cùng một khung chương trình.",
        "Invalid language of instruction. Must be one of: [VIETNAMESE, ENGLISH, BILINGUAL, FRENCH, JAPANESE, CHINESE, KOREAN]":
            "Ngôn ngữ giảng dạy không hợp lệ.",
        "Invalid language of instruction list. Must be one of: [VIETNAMESE, ENGLISH, BILINGUAL, FRENCH, JAPANESE, CHINESE, KOREAN, GERMAN]":
            "Danh sách ngôn ngữ giảng dạy không hợp lệ.",
        "Invalid program category. Must be one of: [MOET, MOET_INTEGRATED, CAMBRIDGE, IB, AMERICAN_AP, OXFORD, VOCATIONAL_ORIENTED]":
            "Loại chương trình không hợp lệ.",
        "Invalid fee unit. Must be one of: [YEAR, SEMESTER, QUARTER, MONTH]": "Đơn vị học phí không hợp lệ.",
        // Thông điệp tiếng Việt từ ProgramValidation (BE)
        "Dữ liệu yêu cầu không được để trống": "Dữ liệu yêu cầu không được để trống",
        "Yêu cầu mã khung chương trình (Curriculum ID)": "Yêu cầu mã khung chương trình (Curriculum ID)",
        "Khung chương trình không hợp lệ hoặc không thuộc về trường của bạn": "Khung chương trình không hợp lệ hoặc không thuộc về trường của bạn",
        "Không thể sử dụng khung chương trình này. Chỉ những khung chương trình đang HOẠT ĐỘNG mới có thể liên kết với chương trình đào tạo.":
            "Không thể sử dụng khung chương trình này. Chỉ những khung chương trình đang HOẠT ĐỘNG mới có thể liên kết với chương trình đào tạo.",
        "Tên chương trình không được để trống": "Tên chương trình không được để trống",
        "Tên chương trình quá dài (tối đa 100 ký tự)": "Tên chương trình quá dài (tối đa 100 ký tự)",
        "Chuẩn đầu ra không được để trống": "Chuẩn đầu ra không được để trống",
        "Chuẩn đầu ra quá dài (tối đa 2000 ký tự)": "Chuẩn đầu ra quá dài (tối đa 2000 ký tự)",
        "Yêu cầu ít nhất một ngôn ngữ giảng dạy.": "Yêu cầu ít nhất một ngôn ngữ giảng dạy.",
        "Học phí không được để trống": "Học phí không được để trống",
        "Học phí không được là số âm": "Học phí không được là số âm",
        "Đơn vị tính phí không được để trống": "Đơn vị tính phí không được để trống",
        "Mô tả đối tượng học sinh không được để trống": "Mô tả đối tượng học sinh không được để trống",
        "Mô tả đối tượng học sinh quá dài (tối đa 2000 ký tự)": "Mô tả đối tượng học sinh quá dài (tối đa 2000 ký tự)",
        "Tên môn học bổ sung không được để trống": "Tên môn học bổ sung không được để trống",
        "Không tìm thấy chương trình đào tạo trong phạm vi quản lý của trường bạn": "Không tìm thấy chương trình đào tạo trong phạm vi quản lý của trường bạn",
        "Tên chương trình đào tạo đã tồn tại trong khung chương trình này": "Tên chương trình đào tạo đã tồn tại trong khung chương trình này",
        "Không thể thay đổi khung chương trình của một chương trình đào tạo đang HOẠT ĐỘNG.":
            "Không thể thay đổi khung chương trình của một chương trình đào tạo đang HOẠT ĐỘNG.",
        "Không thể thay đổi học phí hoặc đơn vị tính của chương trình đào tạo đang HOẠT ĐỘNG. Vui lòng đóng chương trình này và tạo chương trình mới.":
            "Không thể thay đổi học phí hoặc đơn vị tính của chương trình đào tạo đang HOẠT ĐỘNG. Vui lòng đóng chương trình này và tạo chương trình mới.",
        "Không thể thay đổi khung chương trình vì chương trình đào tạo này đã có các suất tuyển sinh hoặc hồ sơ nhập học đang hoạt động.":
            "Không thể thay đổi khung chương trình vì chương trình đào tạo này đã có các suất tuyển sinh hoặc hồ sơ nhập học đang hoạt động.",
        "Chuẩn đầu ra đã tồn tại trong khung chương trình này": "Chuẩn đầu ra đã tồn tại trong khung chương trình này",
    };

    if (map[msg]) return map[msg];

    if (msg.startsWith("Ngôn ngữ không hợp lệ:")) return msg;
    if (msg.startsWith("Môn học '") && msg.includes("đã tồn tại trong Khung chương trình cốt lõi")) return msg;
    if (msg.startsWith("Phát hiện tên môn học bổ sung bị trùng lặp trong yêu cầu:")) return msg;
    if (msg.startsWith("Mô tả cho môn học bổ sung '") && msg.includes("không được để trống")) return msg;
    if (msg.startsWith("Đơn vị tính phí không hợp lệ")) return msg;

    if (msg.startsWith("Invalid language of instruction list.")) return "Danh sách ngôn ngữ giảng dạy không hợp lệ.";
    if (msg.startsWith("Invalid language of instruction.")) return "Ngôn ngữ giảng dạy không hợp lệ.";
    if (msg.startsWith("Language of instruction list is required")) return "Ngôn ngữ giảng dạy là bắt buộc.";
    if (msg.startsWith("Language of instruction is required")) return "Ngôn ngữ giảng dạy là bắt buộc.";
    if (msg.startsWith("Invalid program category.")) return "Loại chương trình không hợp lệ.";
    if (msg.startsWith("Program category is required")) return "Loại chương trình là bắt buộc.";
    if (msg.startsWith("Invalid fee unit.")) return "Đơn vị học phí không hợp lệ.";
    if (msg.startsWith("Fee unit is required")) return "Đơn vị học phí là bắt buộc.";

    return msg;
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
    const nameInputRef = useRef(null);
    const formDialogContentRef = useRef(null);

    // Clone flow
    const [cloneConfirmOpen, setCloneConfirmOpen] = useState(false);
    const [cloneTargetProgram, setCloneTargetProgram] = useState(null);
    const [cloneLoading, setCloneLoading] = useState(false);
    const [isClonedDraftEdit, setIsClonedDraftEdit] = useState(false);
    const [shouldAutoSelectClonedName, setShouldAutoSelectClonedName] = useState(false);

    // Activate/Deactivate flow
    const [actionConfirmOpen, setActionConfirmOpen] = useState(false);
    const [actionTargetProgram, setActionTargetProgram] = useState(null);
    const [actionType, setActionType] = useState("ACTIVATE"); // "ACTIVATE" | "DEACTIVATE"
    const [actionLoading, setActionLoading] = useState(false);

    const [formValues, setFormValues] = useState({
        name: "",
        languageOfInstructionList: [],
        baseTuitionFee: "",
        feeUnit: "",
        graduationStandard: "",
        targetStudentDescription: "",
        extraSubjectList: [],
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
            list = list.filter((p) => {
                const inCurriculum = safeString(p.curriculumName).toLowerCase().includes(q);
                const inName = safeString(p.name).toLowerCase().includes(q);
                return inCurriculum || inName;
            });
        }
        if (enrollmentYearFilter !== "all") {
            const y = Number(enrollmentYearFilter);
            list = list.filter((p) => Number(p.enrollmentYear) === y);
        }
        if (curriculumTypeFilter !== "all") {
            list = list.filter((p) => p.curriculumType === curriculumTypeFilter);
        }
        if (statusFilter !== "all") {
            list = list.filter((p) => p.status === statusFilter);
        }
        return list;
    }, [programs, search, enrollmentYearFilter, curriculumTypeFilter, statusFilter]);

    const tableColSpan = isPrimaryBranch ? 5 : 4;

    const loadData = async (pageParam = page, pageSizeParam = rowsPerPage) => {
        setLoading(true);
        try {
            const res = await getProgramList(pageParam, pageSizeParam);
            const raw = res?.data?.body ?? res?.body ?? res?.data ?? res;
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

    // After cloning, auto-focus and select the " - Cloned (xxxx)" suffix so admin can replace quickly.
    useEffect(() => {
        if (!programModalOpen) return;
        if (modalMode !== "edit") return;
        if (!isClonedDraftEdit) return;
        if (!shouldAutoSelectClonedName) return;
        if (activeStep !== 1) return;

        const input = nameInputRef?.current;
        if (!input) return;

        const name = safeString(formValues.name);
        const idx = name.indexOf(" - Cloned");
        const fallbackIdx = name.indexOf("Cloned");
        const start = idx >= 0 ? idx : fallbackIdx;
        if (start >= 0) {
            input.focus();
            // Give MUI one tick to ensure focus/selection works reliably.
            setTimeout(() => {
                try {
                    input.setSelectionRange(start, name.length);
                } catch {
                    // ignore
                }
            }, 0);
        } else {
            input.focus();
        }

        setShouldAutoSelectClonedName(false);
    }, [programModalOpen, modalMode, isClonedDraftEdit, shouldAutoSelectClonedName, activeStep, formValues.name]);

    const handleOpenCreate = async () => {
        if (!isPrimaryBranch) return;
        setModalMode("create");
        setActiveStep(0);
        setSelectedProgram(null);
        setIsClonedDraftEdit(false);
        setShouldAutoSelectClonedName(false);
        setOriginalCurriculumId(null);
        setDisableCurriculumSelection(false);
        setCurriculumSelectionWarning("");
        setSelectedCurriculum(null);
        setFormErrors({});
        setFormValues({
            name: "",
            languageOfInstructionList: [],
            baseTuitionFee: "",
            graduationStandard: "",
            targetStudentDescription: "",
            feeUnit: "",
            extraSubjectList: [],
        });
        setProgramModalOpen(true);
        await ensureCurriculumOptionsLoaded();
    };

    const handleOpenEdit = async (program, { startStep = 0, markAsClonedDraft = false } = {}) => {
        if (!isPrimaryBranch) return;
        setModalMode("edit");
        setActiveStep(startStep);
        setSelectedProgram(program);
        setIsClonedDraftEdit(!!markAsClonedDraft);
        setShouldAutoSelectClonedName(!!markAsClonedDraft);
        setOriginalCurriculumId(program.curriculumId ?? null);
        const isActiveProgram = normalizeStatus(program.status) === "PRO_ACTIVE";
        const hasOfferingHistory = Number(program.offeringCount) > 0;
        const shouldDisableCurriculum = isActiveProgram || hasOfferingHistory;
        setDisableCurriculumSelection(shouldDisableCurriculum);
        setCurriculumSelectionWarning(
            isActiveProgram
                ? "Chương trình đang hoạt động: không thể thay đổi Khung chương trình (Curriculum), học phí gốc và đơn vị học phí."
                : hasOfferingHistory
                  ? "Chương trình đã có lịch sử tuyển sinh (offering). Không thể thay đổi Khung chương trình (Curriculum)."
                  : ""
        );
        setSelectedCurriculum(null);
        setFormErrors({});
        setFormValues({
            name: program.name ?? "",
            languageOfInstructionList: Array.isArray(program.languageOfInstructionList)
                ? program.languageOfInstructionList
                : [],
            baseTuitionFee: tuitionFeeToDigitString(program.baseTuitionFee),
            feeUnit: program.feeUnit ?? "",
            graduationStandard: program.graduationStandard ?? "",
            targetStudentDescription: program.targetStudentDescription ?? "",
            extraSubjectList: Array.isArray(program.extraSubjectList)
                ? program.extraSubjectList.map((s) => ({
                      name: s?.name ?? "",
                      description: s?.description ?? "",
                      isMandatory: !!s?.isMandatory,
                  }))
                : [],
        });
        setProgramModalOpen(true);
        await ensureCurriculumOptionsLoaded();
        // selection will be picked by useEffect after options load
    };

    const handleOpenView = (program) => {
        setModalMode("view");
        setActiveStep(0);
        setSelectedProgram(program);
        setIsClonedDraftEdit(false);
        setShouldAutoSelectClonedName(false);
        setOriginalCurriculumId(null);
        setDisableCurriculumSelection(false);
        setCurriculumSelectionWarning("");
        setSelectedCurriculum(null);
        setFormErrors({});
        setFormValues({
            name: program.name ?? "",
            languageOfInstructionList: Array.isArray(program.languageOfInstructionList)
                ? program.languageOfInstructionList
                : [],
            baseTuitionFee: tuitionFeeToDigitString(program.baseTuitionFee),
            feeUnit: program.feeUnit ?? "",
            graduationStandard: program.graduationStandard ?? "",
            targetStudentDescription: program.targetStudentDescription ?? "",
            extraSubjectList: Array.isArray(program.extraSubjectList)
                ? program.extraSubjectList.map((s) => ({
                      name: s?.name ?? "",
                      description: s?.description ?? "",
                      isMandatory: !!s?.isMandatory,
                  }))
                : [],
        });
        setProgramModalOpen(true);
    };

    const handleCloseProgramModal = () => {
        if (submitLoading) return;
        setProgramModalOpen(false);
        setActiveStep(0);
        setSelectedProgram(null);
        setIsClonedDraftEdit(false);
        setShouldAutoSelectClonedName(false);
        setOriginalCurriculumId(null);
        setDisableCurriculumSelection(false);
        setCurriculumSelectionWarning("");
        setSelectedCurriculum(null);
        setFormErrors({});
        setFormValues({
            name: "",
            languageOfInstructionList: [],
            baseTuitionFee: "",
            graduationStandard: "",
            targetStudentDescription: "",
            feeUnit: "",
            extraSubjectList: [],
        });
    };

    const effectiveCurriculumId = disableCurriculumSelection && originalCurriculumId ? originalCurriculumId : selectedCurriculum?.id;

    const validateStep1 = () => {
        const errors = {};
        if (!effectiveCurriculumId) {
            errors.curriculumId = "Yêu cầu mã khung chương trình (Curriculum ID)";
        } else {
            const cur =
                selectedCurriculum?.id === effectiveCurriculumId
                    ? selectedCurriculum
                    : curriculumOptions.find((c) => c.id === effectiveCurriculumId);
            if (cur && normalizeStatus(cur.curriculumStatus) !== "CUR_ACTIVE") {
                errors.curriculumId =
                    "Không thể sử dụng khung chương trình này. Chỉ những khung chương trình đang HOẠT ĐỘNG mới có thể liên kết với chương trình đào tạo.";
            }
        }
        setFormErrors((prev) => ({ ...prev, ...errors }));
        return Object.keys(errors).length === 0;
    };

    const validateStep2 = () => {
        const errors = {};
        const curriculumId = effectiveCurriculumId;
        const curriculumForExtras =
            selectedCurriculum?.id === curriculumId
                ? selectedCurriculum
                : curriculumOptions.find((c) => c.id === curriculumId) || selectedCurriculum;
        const coreSubjects = Array.isArray(curriculumForExtras?.subjects) ? curriculumForExtras.subjects : [];
        const coreNameSet = new Set(
            coreSubjects
                .map((s) => normalizeField(s?.name))
                .filter(Boolean)
                .map((n) => n.toLowerCase())
        );

        const nm = normalizeField(formValues.name);
        if (!nm) errors.name = "Tên chương trình không được để trống";
        else if (nm.length > MAX_PROGRAM_NAME_LEN) errors.name = "Tên chương trình quá dài (tối đa 100 ký tự)";

        const languageOfInstructionList = Array.isArray(formValues.languageOfInstructionList)
            ? formValues.languageOfInstructionList
            : [];
        if (languageOfInstructionList.length === 0) {
            errors.languageOfInstructionList = "Yêu cầu ít nhất một ngôn ngữ giảng dạy.";
        } else {
            const badLang = languageOfInstructionList.find((lang) => !isValidLanguageOfInstruction(lang));
            if (badLang != null) {
                errors.languageOfInstructionList = `Ngôn ngữ không hợp lệ: ${badLang}. Phải là một trong: ${LANGUAGE_INSTRUCTION_VALUES.join(", ")}`;
            }
        }

        const feeDigits = safeString(formValues.baseTuitionFee).replace(/\D/g, "");
        const fee = feeDigits === "" ? NaN : Number(feeDigits);
        if (feeDigits === "" || !Number.isFinite(fee)) errors.baseTuitionFee = "Học phí không được để trống";
        else if (fee < 0) errors.baseTuitionFee = "Học phí không được là số âm";

        const feeUnitRaw = normalizeField(formValues.feeUnit);
        if (!feeUnitRaw) errors.feeUnit = "Đơn vị tính phí không được để trống";
        else if (!isValidFeeUnit(feeUnitRaw)) {
            errors.feeUnit = `Đơn vị tính phí không hợp lệ. Phải là một trong: ${FEE_UNIT_VALUES.join(", ")}`;
        }

        const gs = normalizeField(formValues.graduationStandard);
        if (!gs) errors.graduationStandard = "Chuẩn đầu ra không được để trống";
        else if (gs.length > MAX_TEXT_FIELD_LEN) errors.graduationStandard = "Chuẩn đầu ra quá dài (tối đa 2000 ký tự)";

        const td = normalizeField(formValues.targetStudentDescription);
        if (!td) errors.targetStudentDescription = "Mô tả đối tượng học sinh không được để trống";
        else if (td.length > MAX_TEXT_FIELD_LEN)
            errors.targetStudentDescription = "Mô tả đối tượng học sinh quá dài (tối đa 2000 ký tự)";

        const extraSubjectList = Array.isArray(formValues.extraSubjectList) ? formValues.extraSubjectList : [];
        const extraNamesSeen = new Set();
        for (const s of extraSubjectList) {
            const rawName = normalizeField(s?.name);
            const rawDesc = normalizeField(s?.description);
            if (rawName == null && rawDesc == null) continue;

            if (rawName == null) {
                errors.extraSubjectList = "Tên môn học bổ sung không được để trống";
                break;
            }
            if (coreNameSet.has(rawName.toLowerCase())) {
                errors.extraSubjectList = `Môn học '${rawName}' đã tồn tại trong Khung chương trình cốt lõi.`;
                break;
            }
            const key = rawName.toLowerCase();
            if (extraNamesSeen.has(key)) {
                errors.extraSubjectList = `Phát hiện tên môn học bổ sung bị trùng lặp trong yêu cầu: ${rawName}`;
                break;
            }
            extraNamesSeen.add(key);
            if (rawDesc == null) {
                errors.extraSubjectList = `Mô tả cho môn học bổ sung '${rawName}' không được để trống.`;
                break;
            }
        }

        if (curriculumId && !errors.name && nm) {
            const selfId = modalMode === "edit" && selectedProgram?.id != null ? Number(selectedProgram.id) : null;
            const dupName = programs.some(
                (p) =>
                    p.curriculumId === curriculumId &&
                    normalizeField(p.name)?.toLowerCase() === nm.toLowerCase() &&
                    (selfId == null || !Number.isFinite(selfId) || Number(p.id) !== selfId)
            );
            if (dupName) errors.name = "Tên chương trình đào tạo đã tồn tại trong khung chương trình này";
        }

        if (curriculumId && !errors.graduationStandard && gs) {
            const selfId = modalMode === "edit" && selectedProgram?.id != null ? Number(selectedProgram.id) : null;
            const dupGs = programs.some(
                (p) =>
                    p.curriculumId === curriculumId &&
                    normalizeField(p.graduationStandard)?.toLowerCase() === gs.toLowerCase() &&
                    (selfId == null || !Number.isFinite(selfId) || Number(p.id) !== selfId)
            );
            if (dupGs) errors.graduationStandard = "Chuẩn đầu ra đã tồn tại trong khung chương trình này";
        }

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

    useEffect(() => {
        if (!programModalOpen) return;
        if (modalMode === "view") return;
        const el = formDialogContentRef.current;
        if (!el) return;
        el.scrollTo({ top: 0, behavior: "smooth" });
    }, [activeStep, programModalOpen, modalMode]);

    const buildPayload = (curriculumIdOverride) => {
        const curriculumId = curriculumIdOverride ?? effectiveCurriculumId;
        const feeDigits = safeString(formValues.baseTuitionFee).replace(/\D/g, "");
        const payload = {
            curriculumId,
            name: safeString(formValues.name).trim(),
            languageOfInstructionList: (formValues.languageOfInstructionList || []).filter(Boolean),
            graduationStandard: safeString(formValues.graduationStandard).trim(),
            targetStudentDescription: safeString(formValues.targetStudentDescription).trim(),
            baseTuitionFee: feeDigits === "" ? 0 : Number(feeDigits),
            feeUnit: safeString(formValues.feeUnit).trim(),
            extraSubjectList: (formValues.extraSubjectList || [])
                .map((s) => ({
                    name: safeString(s?.name).trim(),
                    description: safeString(s?.description).trim(),
                    isMandatory: !!s?.isMandatory,
                }))
                .filter((s) => s.name),
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
            enqueueSnackbar("Yêu cầu mã khung chương trình (Curriculum ID)", { variant: "error" });
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
                setIsClonedDraftEdit(false);
                setShouldAutoSelectClonedName(false);
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
                else if (status === 409) backendMsg = "Chuẩn đầu ra đã tồn tại trong khung chương trình này";
                else backendMsg = "Lỗi khi lưu program";
            }
            const normalized = String(backendMsg || "").toLowerCase();
            const backendMsgVi = mapProgramBackendMessageToVi(backendMsg) || backendMsg || "Lỗi khi lưu program";

            const cannotChangeCurriculum =
                normalized.includes("cannot change curriculum") ||
                (normalized.includes("không thể thay đổi khung chương trình") &&
                    !normalized.includes("học phí") &&
                    !normalized.includes("đơn vị tính"));
            const cannotChangeTuitionOrFeeUnit =
                normalized.includes("cannot change tuition fee") ||
                normalized.includes("cannot change fee unit") ||
                normalized.includes("không thể thay đổi học phí") ||
                normalized.includes("đơn vị tính của chương trình đào tạo đang hoạt động");

            if (cannotChangeCurriculum) {
                setDisableCurriculumSelection(true);
                if (
                    normalized.includes("active offerings") ||
                    normalized.includes("active offerings/enrollments") ||
                    normalized.includes("suất tuyển sinh") ||
                    normalized.includes("hồ sơ nhập học")
                ) {
                    setCurriculumSelectionWarning(
                        "Không thể thay đổi khung chương trình vì chương trình đào tạo này đã có các suất tuyển sinh hoặc hồ sơ nhập học đang hoạt động."
                    );
                } else {
                    setCurriculumSelectionWarning(
                        "Không thể thay đổi khung chương trình của một chương trình đào tạo đang HOẠT ĐỘNG."
                    );
                }

                if (originalCurriculumId) {
                    const originalCur = curriculumOptions.find((c) => c.id === originalCurriculumId);
                    if (originalCur) setSelectedCurriculum(originalCur);
                }
            }

            if (cannotChangeTuitionOrFeeUnit) {
                setCurriculumSelectionWarning(
                    "Không thể thay đổi học phí hoặc đơn vị tính của chương trình đào tạo đang HOẠT ĐỘNG. Vui lòng đóng chương trình này và tạo chương trình mới."
                );
            }

            enqueueSnackbar(backendMsgVi, { variant: "error" });
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

    const coreLockedByActive =
        modalMode === "edit" && selectedProgram != null && normalizeStatus(selectedProgram.status) === "PRO_ACTIVE";

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
                                ? "Tạo mới, cập nhật và kích hoạt/tạm dừng trạng thái các program."
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
                            placeholder="Tìm theo tên program hoặc khung chương trình..."
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
                                <TableCell sx={{ fontWeight: 800, color: "#1e293b", py: 2 }}>Program / Khung CT</TableCell>
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
                                                    Tạo Program
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
                                            <Tooltip
                                                title={
                                                    [safeString(row.name).trim(), safeString(row.curriculumName).trim()]
                                                        .filter(Boolean)
                                                        .join(" • ") || "—"
                                                }
                                            >
                                                <Box>
                                                    <Typography sx={{ fontWeight: 800, color: "#1e293b" }} noWrap>
                                                        {safeString(row.name).trim() || row.curriculumName || "—"}
                                                    </Typography>
                                                    {safeString(row.name).trim() && row.curriculumName ? (
                                                        <Typography variant="caption" sx={{ color: "#64748b", display: "block" }} noWrap>
                                                            {row.curriculumName}
                                                        </Typography>
                                                    ) : null}
                                                </Box>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell sx={{ color: "#64748b" }}>{toCurriculumTypeLabel(row.curriculumType)}</TableCell>
                                        <TableCell sx={{ color: "#64748b" }}>{formatVND(row.baseTuitionFee)}</TableCell>
                                        <TableCell>
                                            <ProgramStatusBadge status={row.status} isActiveBool={row.isActiveBool} />
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
                                                            if (!isPrimaryBranch) return;
                                                            setCloneTargetProgram(row);
                                                            setCloneConfirmOpen(true);
                                                        }}
                                                        sx={{
                                                            color: "#64748b",
                                                            "&:hover": { color: "#0D64DE", bgcolor: "rgba(13, 100, 222, 0.08)" },
                                                        }}
                                                        title="Nhân bản chương trình này"
                                                    >
                                                        <ContentCopyRoundedIcon fontSize="small" />
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
                onClose={(event, reason) => {
                    if (reason === "backdropClick") return;
                    handleCloseProgramModal();
                }}
                fullWidth
                maxWidth="md"
                PaperProps={{ sx: modalPaperSx }}
                slotProps={{ backdrop: { sx: modalBackdropSx } }}
            >
                <DialogTitle sx={{ fontWeight: 900, color: "#1e293b", px: 3, pt: 2.6, pb: 0 }}>
                    <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", width: "100%", gap: 2 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexWrap: "wrap", flex: 1, minWidth: 0 }}>
                            {modalMode === "create"
                                ? "Tạo Program"
                                : modalMode === "edit"
                                  ? isClonedDraftEdit
                                      ? "Chỉnh sửa Chương trình (Bản sao)"
                                      : "Chỉnh sửa Program"
                                  : "Chi tiết Program"}
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                            {modalMode === "edit" && isClonedDraftEdit ? (
                                <Chip
                                    label="BẢN NHÁP"
                                    sx={{
                                        bgcolor: "rgba(234, 179, 8, 0.14)",
                                        color: "#b45309",
                                        fontWeight: 900,
                                        borderRadius: 999,
                                    }}
                                />
                            ) : null}
                            <IconButton
                                aria-label="Đóng"
                                onClick={handleCloseProgramModal}
                                disabled={submitLoading}
                                size="small"
                                sx={{ mt: -0.5, mr: -0.5, color: "#64748b" }}
                            >
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    </Box>
                </DialogTitle>

                <DialogContent ref={formDialogContentRef} dividers={false} sx={{ px: 3, pt: 1.6, pb: 1 }}>
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
                                        <Stack
                                            direction={{ xs: "column", sm: "row" }}
                                            spacing={2}
                                            alignItems={{ xs: "stretch", sm: "flex-start" }}
                                            justifyContent="space-between"
                                        >
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography variant="caption" sx={{ color: "#0D64DE", display: "block", mb: 0.6, fontWeight: 900 }}>
                                                    Khung chương trình
                                                </Typography>
                                                <Typography sx={{ fontWeight: 900, color: "#1e293b" }}>
                                                    {selectedProgram.curriculumName}
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: "#64748b" }}>
                                                    {selectedProgram.enrollmentYear || "—"}  {toCurriculumTypeLabel(selectedProgram.curriculumType)}
                                                </Typography>
                                            </Box>
                                            {isPrimaryBranch ? (
                                                <Stack
                                                    direction="row"
                                                    spacing={1}
                                                    justifyContent={{ xs: "flex-start", sm: "flex-end" }}
                                                    sx={{ flexShrink: 0, pt: { xs: 0, sm: 0.25 } }}
                                                >
                                                    {normalizeStatus(selectedProgram.status) === "PRO_ACTIVE" ? (
                                                        <Button
                                                            variant="contained"
                                                            startIcon={<PowerSettingsNewRoundedIcon fontSize="small" />}
                                                            onClick={() => {
                                                                setActionTargetProgram(selectedProgram);
                                                                setActionType("DEACTIVATE");
                                                                setActionConfirmOpen(true);
                                                            }}
                                                            disabled={actionLoading}
                                                            sx={{
                                                                textTransform: "none",
                                                                fontWeight: 900,
                                                                borderRadius: 2,
                                                                bgcolor: "#fb923c",
                                                                "&:hover": { bgcolor: "#f97316" },
                                                            }}
                                                        >
                                                            Tạm dừng
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="contained"
                                                            startIcon={<CheckCircleOutlineIcon fontSize="small" />}
                                                            onClick={() => {
                                                                setActionTargetProgram(selectedProgram);
                                                                setActionType("ACTIVATE");
                                                                setActionConfirmOpen(true);
                                                            }}
                                                            disabled={actionLoading}
                                                            sx={{
                                                                textTransform: "none",
                                                                fontWeight: 900,
                                                                borderRadius: 2,
                                                                bgcolor: "#22c55e",
                                                                "&:hover": { bgcolor: "#16a34a" },
                                                            }}
                                                        >
                                                            Kích hoạt
                                                        </Button>
                                                    )}
                                                </Stack>
                                            ) : null}
                                        </Stack>

                                        <Divider />

                                        <Box>
                                            <Typography variant="caption" sx={{ color: "#0D64DE", display: "block", mb: 0.6, fontWeight: 900 }}>
                                                Tên program
                                            </Typography>
                                            <Typography sx={{ fontWeight: 900, color: "#1e293b" }}>
                                                {safeString(formValues.name).trim() || "—"}
                                            </Typography>
                                        </Box>

                                            <Box>
                                                <Typography variant="caption" sx={{ color: "#0D64DE", display: "block", mb: 0.6, fontWeight: 900 }}>
                                                    Ngôn ngữ giảng dạy
                                                </Typography>
                                                <Typography sx={{ fontWeight: 900, color: "#1e293b" }}>
                                                    {getEnumListLabel(LANGUAGE_OPTIONS, formValues.languageOfInstructionList)}
                                                </Typography>
                                            </Box>

                                        <Box>
                                            <Typography variant="caption" sx={{ color: "#0D64DE", display: "block", mb: 0.6, fontWeight: 900 }}>
                                                Học phí gốc
                                            </Typography>
                                                <Typography sx={{ fontWeight: 950, color: "#1e293b" }}>
                                                    {formatVND(formValues.baseTuitionFee)} • {getEnumLabel(FEE_UNIT_OPTIONS, formValues.feeUnit)}
                                                </Typography>
                                        </Box>

                                        <Box>
                                            <Typography variant="caption" sx={{ color: "#0D64DE", display: "block", mb: 0.6, fontWeight: 900 }}>
                                                Đối tượng học sinh
                                            </Typography>
                                            <Typography sx={{ color: "#334155", whiteSpace: "pre-wrap" }}>
                                                {formValues.targetStudentDescription || "—"}
                                            </Typography>
                                        </Box>

                                        <Box>
                                            <Typography variant="caption" sx={{ color: "#0D64DE", display: "block", mb: 0.6, fontWeight: 900 }}>
                                                Tiêu chuẩn đầu ra
                                            </Typography>
                                            <Typography sx={{ color: "#334155", whiteSpace: "pre-wrap" }}>
                                                {formValues.graduationStandard || "—"}
                                            </Typography>
                                        </Box>

                                        <Box>
                                            <Typography variant="caption" sx={{ color: "#0D64DE", display: "block", mb: 0.6, fontWeight: 900 }}>
                                                Môn bổ sung
                                            </Typography>
                                            <ExtraSubjectReadOnlyList value={formValues.extraSubjectList} />
                                        </Box>

                                        <Box>
                                            <Typography variant="caption" sx={{ color: "#0D64DE", display: "block", mb: 0.6, fontWeight: 900 }}>
                                                Trạng thái
                                            </Typography>
                                            <ProgramStatusBadge
                                                status={selectedProgram?.status}
                                                isActiveBool={selectedProgram?.isActiveBool}
                                            />
                                        </Box>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Stack>
                    ) : (
                        <>
                            {modalMode === "edit" && isClonedDraftEdit ? (
                                <Alert severity="info" sx={{ py: 1.1, mt: 1.25, mb: 2 }}>
                                    Đây là bản sao mới khởi tạo. Bạn có thể thay đổi học phí và khung chương trình tại đây.
                                </Alert>
                            ) : null}
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
                                    Bước 1: Chọn khung chương trình (Curriculum)
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
                                    Bước 2: Nhập thông tin Program
                                </Typography>

                                {curriculumSelectionWarning && (
                                    <Alert severity="warning">{curriculumSelectionWarning}</Alert>
                                )}

                                <TextField
                                    label="Tên program"
                                    fullWidth
                                    required
                                    value={formValues.name}
                                    inputRef={nameInputRef}
                                    onChange={(e) => {
                                        setFormValues((prev) => ({ ...prev, name: e.target.value }));
                                        setFormErrors((prev) => ({ ...prev, name: undefined }));
                                    }}
                                    inputProps={{ maxLength: MAX_PROGRAM_NAME_LEN }}
                                    error={!!formErrors.name}
                                    helperText={
                                        formErrors.name || `Tên hiển thị của program. Tối đa ${MAX_PROGRAM_NAME_LEN} ký tự.`
                                    }
                                />

                                <LanguageInstructionSelector
                                    value={formValues.languageOfInstructionList}
                                    options={LANGUAGE_OPTIONS}
                                    onChange={(next) => {
                                        setFormValues((prev) => ({ ...prev, languageOfInstructionList: next }));
                                        setFormErrors((prev) => ({ ...prev, languageOfInstructionList: undefined }));
                                    }}
                                    error={formErrors.languageOfInstructionList}
                                />

                                <Tooltip
                                    title={coreLockedByActive ? "Không thể sửa thông tin cốt lõi của chương trình đang hoạt động" : ""}
                                    disableHoverListener={!coreLockedByActive}
                                >
                                    <span>
                                        <TextField
                                            label="Học phí gốc"
                                            fullWidth
                                            disabled={coreLockedByActive}
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
                                    </span>
                                </Tooltip>

                                <Tooltip
                                    title={coreLockedByActive ? "Không thể sửa thông tin cốt lõi của chương trình đang hoạt động" : ""}
                                    disableHoverListener={!coreLockedByActive}
                                >
                                    <span>
                                        <SelectLike
                                            label="Đơn vị học phí"
                                            value={formValues.feeUnit}
                                            options={FEE_UNIT_OPTIONS}
                                            onChange={(v) => {
                                                setFormValues((prev) => ({ ...prev, feeUnit: v }));
                                                setFormErrors((prev) => ({ ...prev, feeUnit: undefined }));
                                            }}
                                            error={!!formErrors.feeUnit}
                                            helperText={formErrors.feeUnit || ""}
                                            disabled={coreLockedByActive}
                                        />
                                    </span>
                                </Tooltip>

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

                                <ExtraSubjectEditor
                                    value={formValues.extraSubjectList}
                                    onChange={(next) => {
                                        setFormValues((prev) => ({ ...prev, extraSubjectList: next }));
                                        setFormErrors((prev) => ({ ...prev, extraSubjectList: undefined }));
                                    }}
                                    error={formErrors.extraSubjectList}
                                    disabled={false}
                                />

                                {coreLockedByActive ? (
                                    <Alert severity="info" sx={{ py: 1, mt: 1.2 }}>
                                        Không thể sửa thông tin cốt lõi của chương trình đang hoạt động.
                                    </Alert>
                                ) : null}
                            </>
                        )}

                        {activeStep === 2 && (
                            <>
                                <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#1e293b" }}>
                                    Bước 3: Xem lại & Gửi yêu cầu
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
                                                    {curriculumPreview?.enrollmentYear || selectedCurriculum?.enrollmentYear || "—"} {" "}
                                                    {toCurriculumTypeLabel(curriculumPreview?.curriculumType || selectedCurriculum?.curriculumType)}
                                                </Typography>
                                            </Box>

                                            <Divider />

                                            <Box>
                                                <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", mb: 0.6, fontWeight: 900 }}>
                                                    Tên program
                                                </Typography>
                                                <Typography sx={{ fontWeight: 900, color: "#1e293b" }}>
                                                    {safeString(formValues.name).trim() || "—"}
                                                </Typography>
                                            </Box>

                                            <Box>
                                                <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", mb: 0.6, fontWeight: 900 }}>
                                                    Ngôn ngữ giảng dạy
                                                </Typography>
                                                <Typography sx={{ fontWeight: 900, color: "#1e293b" }}>
                                                    {getEnumListLabel(LANGUAGE_OPTIONS, formValues.languageOfInstructionList)}
                                                </Typography>
                                            </Box>

                                            <Box>
                                                <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", mb: 0.6, fontWeight: 900 }}>
                                                    Học phí gốc
                                                </Typography>
                                                <Typography sx={{ fontWeight: 950, color: "#1e293b" }}>
                                                    {formatVND(formValues.baseTuitionFee)} • {getEnumLabel(FEE_UNIT_OPTIONS, formValues.feeUnit)}
                                                </Typography>
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
                                                    Môn bổ sung
                                                </Typography>
                                                <ExtraSubjectReadOnlyList value={formValues.extraSubjectList} />
                                            </Box>

                                            <Box>
                                                <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", mb: 0.6, fontWeight: 900 }}>
                                                    Trạng thái
                                                </Typography>
                                                <ProgramStatusBadge
                                                    status={modalMode === "create" ? "PRO_DRAFT" : selectedProgram?.status}
                                                    isActiveBool={modalMode === "create" ? false : selectedProgram?.isActiveBool}
                                                />
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
                        <>
                            <Button
                                onClick={handleCloseProgramModal}
                                variant="text"
                                color="inherit"
                                sx={{ textTransform: "none", fontWeight: 800 }}
                                disabled={cloneLoading || actionLoading}
                            >
                                Quay lại
                            </Button>

                            {isPrimaryBranch ? (
                                <Button
                                    variant="outlined"
                                    startIcon={<ContentCopyRoundedIcon fontSize="small" />}
                                    onClick={() => {
                                        setCloneTargetProgram(selectedProgram);
                                        setCloneConfirmOpen(true);
                                    }}
                                    disabled={cloneLoading || actionLoading || !selectedProgram}
                                    sx={{ textTransform: "none", fontWeight: 800, borderRadius: 2, px: 3 }}
                                >
                                    Nhân bản chương trình
                                </Button>
                            ) : null}

                            {isPrimaryBranch ? (
                                <Button
                                    variant="contained"
                                    onClick={() => selectedProgram && handleOpenEdit(selectedProgram)}
                                    disabled={cloneLoading || actionLoading || !selectedProgram}
                                    sx={{
                                        textTransform: "none",
                                        fontWeight: 950,
                                        borderRadius: 2,
                                        px: 3,
                                        background: "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                                    }}
                                >
                                    Chỉnh sửa
                                </Button>
                            ) : null}
                        </>
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

            {/* Clone Program Dialog */}
            <Dialog
                open={cloneConfirmOpen}
                onClose={(event, reason) => {
                    if (reason === "backdropClick") return;
                    if (!cloneLoading) setCloneConfirmOpen(false);
                }}
                fullWidth
                maxWidth="sm"
                PaperProps={{ sx: { borderRadius: "16px", position: "relative" } }}
            >
                <IconButton
                    aria-label="Đóng"
                    onClick={() => !cloneLoading && !actionLoading && setCloneConfirmOpen(false)}
                    disabled={cloneLoading || actionLoading}
                    sx={{ position: "absolute", right: 8, top: 8, zIndex: 1, color: "#64748b" }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
                <DialogContent sx={{ pt: 3, px: 3, pr: 6 }}>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>
                        Nhân bản chương trình đào tạo?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25 }}>
                        Hệ thống sẽ tạo một bản sao mới (trạng thái Nháp) dựa trên toàn bộ thông tin của chương trình này. Bạn có muốn tiếp tục không?
                    </Typography>

                    {cloneLoading ? (
                        <Box sx={{ mt: 2.5, display: "flex", alignItems: "center", gap: 1.5 }}>
                            <CircularProgress size={22} />
                            <Typography variant="body2" sx={{ color: "#64748b", fontWeight: 800 }}>
                                Đang khởi tạo bản sao, vui lòng đợi trong giây lát...
                            </Typography>
                        </Box>
                    ) : null}
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button
                        onClick={() => setCloneConfirmOpen(false)}
                        disabled={cloneLoading || actionLoading}
                        sx={{ textTransform: "none" }}
                    >
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        onClick={async () => {
                            if (!cloneTargetProgram || cloneLoading) return;
                            setCloneLoading(true);
                            try {
                                const res = await cloneProgram(cloneTargetProgram.id);
                                const ok = res?.status >= 200 && res?.status < 300;
                                if (!ok) {
                                    enqueueSnackbar(res?.data?.message || "Không thể nhân bản chương trình.", { variant: "error" });
                                    return;
                                }

                                const rawBody = res?.data?.body ?? res?.data ?? {};
                                const mapped = mapProgramFromApi(rawBody);
                                if (!mapped) {
                                    enqueueSnackbar("Đã nhân bản nhưng không đọc được dữ liệu bản sao mới.", { variant: "warning" });
                                    return;
                                }

                                enqueueSnackbar(
                                    "Thành công! Đã tạo bản sao mới. Bạn đang ở chế độ chỉnh sửa bản nháp.",
                                    { variant: "success" }
                                );
                                setCloneConfirmOpen(false);
                                setCloneTargetProgram(null);

                                await handleOpenEdit(mapped, { startStep: 0, markAsClonedDraft: true });
                            } catch (err) {
                                console.error("Clone program error:", err);
                                enqueueSnackbar(
                                    err?.response?.data?.message || "Không thể nhân bản chương trình. Vui lòng thử lại.",
                                    { variant: "error" }
                                );
                            } finally {
                                setCloneLoading(false);
                            }
                        }}
                        disabled={cloneLoading || actionLoading || !cloneTargetProgram}
                        sx={{ textTransform: "none", fontWeight: 800, borderRadius: "12px", bgcolor: "#3b82f6" }}
                    >
                        Xác nhận nhân bản
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Activate/Deactivate Dialog */}
            <Dialog
                open={actionConfirmOpen}
                onClose={(event, reason) => {
                    if (reason === "backdropClick") return;
                    if (!actionLoading) setActionConfirmOpen(false);
                }}
                fullWidth
                maxWidth="sm"
                PaperProps={{ sx: { borderRadius: "16px", position: "relative" } }}
            >
                <IconButton
                    aria-label="Đóng"
                    onClick={() => !actionLoading && !cloneLoading && setActionConfirmOpen(false)}
                    disabled={actionLoading || cloneLoading}
                    sx={{ position: "absolute", right: 8, top: 8, zIndex: 1, color: "#64748b" }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
                <DialogContent sx={{ pt: 3, px: 3, pr: 6 }}>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>
                        {actionType === "DEACTIVATE" ? "Xác nhận tạm dừng chương trình?" : "Xác nhận kích hoạt chương trình này?"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25 }}>
                        {actionType === "DEACTIVATE"
                            ? "Các trường học phí và khung chương trình sẽ được mở khóa để chỉnh sửa. Lưu ý: Các cơ sở sẽ tạm thời không thấy chương trình này để tạo mới đợt tuyển sinh."
                            : "Sau khi kích hoạt, bạn sẽ không thể thay đổi Học phí và Khung chương trình trực tiếp."}
                    </Typography>

                    {actionLoading ? (
                        <Box sx={{ mt: 2.5, display: "flex", alignItems: "center", gap: 1.5 }}>
                            <CircularProgress size={22} />
                            <Typography variant="body2" sx={{ color: "#64748b", fontWeight: 800 }}>
                                Đang xử lý...
                            </Typography>
                        </Box>
                    ) : null}
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button
                        onClick={() => setActionConfirmOpen(false)}
                        disabled={actionLoading || cloneLoading}
                        sx={{ textTransform: "none" }}
                    >
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        onClick={async () => {
                            if (!actionTargetProgram || actionLoading) return;
                            setActionLoading(true);
                            try {
                                const res = await handleProgramAction(actionTargetProgram.id, actionType);
                                const ok = res?.status >= 200 && res?.status < 300;
                                if (ok) {
                                    enqueueSnackbar(
                                        actionType === "ACTIVATE"
                                            ? "Chương trình đã được kích hoạt thành công. Các cơ sở hiện đã có thể tạo đợt tuyển sinh."
                                            : "Chương trình đã tạm dừng. Bạn hiện có thể chỉnh sửa các thông tin cốt lõi.",
                                        { variant: "success" }
                                    );
                                    setActionConfirmOpen(false);
                                    setActionTargetProgram(null);

                                    // Refresh list & close current modal to avoid stale state.
                                    setProgramModalOpen(false);
                                    setSelectedProgram(null);
                                    setIsClonedDraftEdit(false);
                                    setShouldAutoSelectClonedName(false);

                                    await loadData(0, rowsPerPage);
                                } else {
                                    enqueueSnackbar(
                                        actionType === "ACTIVATE"
                                            ? "Không thể kích hoạt. Vui lòng kiểm tra lại dữ liệu chương trình."
                                            : "Hành động không hợp lệ hoặc chương trình đã ở trạng thái Inactive.",
                                        { variant: "error" }
                                    );
                                }
                            } catch (err) {
                                console.error("Program action error:", err);
                                enqueueSnackbar(
                                    actionType === "ACTIVATE"
                                        ? "Không thể kích hoạt. Vui lòng kiểm tra lại dữ liệu chương trình."
                                        : "Hành động không hợp lệ hoặc chương trình đã ở trạng thái Inactive.",
                                    { variant: "error" }
                                );
                            } finally {
                                setActionLoading(false);
                            }
                        }}
                        disabled={actionLoading || cloneLoading || !actionTargetProgram}
                        sx={{
                            textTransform: "none",
                            fontWeight: 950,
                            borderRadius: 2,
                            px: 3,
                            background: "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                        }}
                    >
                        Xác nhận
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

function SelectLike({ value, options, onChange, label, error, helperText, disabled = false }) {
    return (
        <TextField
            select
            size="small"
            fullWidth
            value={value}
            label={label}
            onChange={(e) => onChange(e.target.value)}
            error={!!error}
            helperText={helperText || ""}
            disabled={disabled}
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

function LanguageInstructionSelector({ value, options, onChange, error }) {
    const selectedValues = Array.isArray(value) ? value : [];

    const toggleValue = (nextValue) => {
        const exists = selectedValues.includes(nextValue);
        onChange(exists ? selectedValues.filter((v) => v !== nextValue) : [...selectedValues, nextValue]);
    };

    return (
        <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography sx={{ fontWeight: 800, color: "#1e293b" }}>Ngôn ngữ giảng dạy</Typography>
                <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700 }}>
                    Có thể chọn nhiều
                </Typography>
            </Stack>

            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 1.5 }}>
                {selectedValues.length > 0 ? (
                    selectedValues.map((item) => (
                        <Chip
                            key={item}
                            label={getEnumLabel(options, item)}
                            onDelete={() => toggleValue(item)}
                            sx={{
                                borderRadius: 2,
                                bgcolor: "rgba(13, 100, 222, 0.1)",
                                color: "#0D64DE",
                                fontWeight: 700,
                            }}
                        />
                    ))
                ) : (
                    <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                        Chưa chọn ngôn ngữ giảng dạy
                    </Typography>
                )}
            </Box>

            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" },
                    gap: 1.75,
                }}
            >
                {(options || []).map((item) => {
                    const selected = selectedValues.includes(item.value);
                    return (
                        <Tooltip key={item.value} title={item.label} arrow placement="top">
                            <Box
                                role="checkbox"
                                aria-checked={selected}
                                aria-label={item.label}
                                tabIndex={0}
                                onClick={() => toggleValue(item.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        toggleValue(item.value);
                                    }
                                }}
                                sx={{
                                    position: "relative",
                                    p: 1.5,
                                    minHeight: 78,
                                    borderRadius: 3,
                                    border: selected ? "1.5px solid #0D64DE" : "1px solid #e2e8f0",
                                    bgcolor: selected ? "rgba(13, 100, 222, 0.07)" : "rgba(255,255,255,0.8)",
                                    boxShadow: selected ? "0 8px 20px rgba(13, 100, 222, 0.16)" : "0 4px 12px rgba(15, 23, 42, 0.06)",
                                    cursor: "pointer",
                                    transition: "all 180ms ease",
                                    "&:hover": {
                                        borderColor: "#0D64DE",
                                        boxShadow: "0 10px 24px rgba(13, 100, 222, 0.18)",
                                        transform: "translateY(-1px)",
                                    },
                                    "&:focus-visible": {
                                        outline: "2px solid rgba(13, 100, 222, 0.5)",
                                        outlineOffset: 2,
                                    },
                                }}
                            >
                                {selected ? (
                                    <CheckCircleOutlineIcon
                                        sx={{
                                            position: "absolute",
                                            top: 8,
                                            right: 8,
                                            fontSize: 18,
                                            color: "#0D64DE",
                                        }}
                                    />
                                ) : null}
                                <Typography sx={{ mt: 0.2, fontWeight: 800, color: "#1e293b", fontSize: 13.5 }}>
                                    {item.label}
                                </Typography>
                                <Typography variant="caption" sx={{ color: "#64748b", mt: 0.2, display: "block" }}>
                                    {item.value}
                                </Typography>
                            </Box>
                        </Tooltip>
                    );
                })}
            </Box>

            {error ? (
                <Typography variant="caption" sx={{ color: "#d32f2f", ml: 0.2, mt: 1, display: "block" }}>
                    {error}
                </Typography>
            ) : null}
        </Box>
    );
}

function ExtraSubjectEditor({ value, onChange, error, disabled = false }) {
    const subjects = Array.isArray(value) ? value : [];
    const extraSubjectItemRefs = useRef([]);
    const [pendingScrollIndex, setPendingScrollIndex] = useState(null);

    useEffect(() => {
        if (pendingScrollIndex == null) return;
        const target = extraSubjectItemRefs.current[pendingScrollIndex];
        if (!target) return;
        requestAnimationFrame(() => {
            target.scrollIntoView({ behavior: "smooth", block: "center" });
        });
        setPendingScrollIndex(null);
    }, [subjects.length, pendingScrollIndex]);

    const addItem = () => {
        setPendingScrollIndex(subjects.length);
        onChange([...subjects, createEmptyExtraSubject()]);
    };
    const removeItem = (index) => onChange(subjects.filter((_, idx) => idx !== index));
    const updateItem = (index, field, nextValue) => {
        onChange(
            subjects.map((item, idx) =>
                idx === index
                    ? {
                          ...item,
                          [field]: field === "isMandatory" ? !!nextValue : nextValue,
                      }
                    : item
            )
        );
    };

    return (
        <Box sx={{ mt: 0.6 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#1e293b" }}>
                    Môn bổ sung
                </Typography>
                <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={addItem}
                    disabled={disabled}
                    sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}
                >
                    Thêm môn
                </Button>
            </Stack>

            {error && typeof error === "string" ? (
                <Typography variant="caption" sx={{ color: "#d32f2f", display: "block", mt: 1.2 }}>
                    {error}
                </Typography>
            ) : null}

            <Stack spacing={1.2} sx={{ mt: 1.2 }}>
                {subjects.length === 0 ? (
                    <Typography variant="body2" sx={{ color: "#94a3b8", px: 0.5 }}>
                        Chưa có môn bổ sung.
                    </Typography>
                ) : null}

                {subjects.map((subject, index) => {
                    const subjectErr = Array.isArray(error) && error[index] ? error[index] : null;
                    return (
                        <Grow in={true} style={{ transformOrigin: "0 0 0" }} key={`extra-subject-${index}`}>
                            <Box
                                ref={(el) => {
                                    extraSubjectItemRefs.current[index] = el;
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
                                        Môn {index + 1}
                                    </Typography>
                                    <IconButton
                                        size="small"
                                        onClick={() => removeItem(index)}
                                        sx={{
                                            color: "#64748b",
                                            "&:hover": { color: "#dc2626", bgcolor: "rgba(220, 38, 38, 0.08)" },
                                        }}
                                        disabled={disabled}
                                        title="Xóa"
                                    >
                                        <DeleteOutlineIcon fontSize="small" />
                                    </IconButton>
                                </Stack>

                                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 1 }}>
                                    <TextField
                                        label="Tên môn"
                                        fullWidth
                                        value={subject?.name ?? ""}
                                        onChange={(e) => updateItem(index, "name", e.target.value)}
                                        error={!!subjectErr?.name}
                                        helperText={subjectErr?.name}
                                        required
                                        disabled={disabled}
                                    />
                                    <TextField
                                        label="Mô tả môn"
                                        fullWidth
                                        value={subject?.description ?? ""}
                                        onChange={(e) => updateItem(index, "description", e.target.value)}
                                        error={!!subjectErr?.description}
                                        helperText={subjectErr?.description}
                                        disabled={disabled}
                                    />
                                </Stack>

                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.2 }}>
                                    <Typography sx={{ fontWeight: 800, color: "#1e293b" }}>Bắt buộc</Typography>
                                    <Switch
                                        checked={!!subject?.isMandatory}
                                        onChange={(e) => updateItem(index, "isMandatory", e.target.checked)}
                                        disabled={disabled}
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

            {error && typeof error !== "string" ? (
                <Typography variant="caption" sx={{ color: "#d32f2f", ml: 0.2, mt: 1, display: "block" }}>
                    Vui lòng kiểm tra thông tin môn bổ sung.
                </Typography>
            ) : (
                null
            )}
        </Box>
    );
}

function ExtraSubjectReadOnlyList({ value }) {
    const subjects = Array.isArray(value) ? value.filter((s) => safeString(s?.name).trim()) : [];
    if (subjects.length === 0) {
        return <Typography sx={{ color: "#94a3b8" }}>Không có môn bổ sung.</Typography>;
    }

    return (
        <Stack spacing={1}>
            {subjects.map((subject, index) => (
                <Box key={`readonly-extra-subject-${index}`} sx={{ border: "1px solid #e2e8f0", borderRadius: 2, p: 1.2, bgcolor: "#fff" }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                        <Typography sx={{ color: "#1e293b", fontWeight: 800 }}>{subject.name}</Typography>
                        <Chip
                            size="small"
                            label={subject.isMandatory ? "Bắt buộc" : "Tự chọn"}
                            sx={{
                                bgcolor: subject.isMandatory ? "rgba(34,197,94,0.12)" : "rgba(148,163,184,0.18)",
                                color: subject.isMandatory ? "#15803d" : "#475569",
                                fontWeight: 700,
                            }}
                        />
                    </Stack>
                    <Typography variant="body2" sx={{ color: "#64748b", mt: 0.6, whiteSpace: "pre-wrap" }}>
                        {safeString(subject.description).trim() || "—"}
                    </Typography>
                </Box>
            ))}
        </Stack>
    );
}

