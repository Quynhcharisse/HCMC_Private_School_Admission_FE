import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
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
import ScienceIcon from "@mui/icons-material/Science";
import GroupsIcon from "@mui/icons-material/Groups";
import ExploreIcon from "@mui/icons-material/Explore";
import HandymanIcon from "@mui/icons-material/Handyman";
import PersonIcon from "@mui/icons-material/Person";
import ComputerIcon from "@mui/icons-material/Computer";
import VisibilityIconOutlined from "@mui/icons-material/VisibilityOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { enqueueSnackbar } from "notistack";
import { ConfirmHighlight } from "../../ui/ConfirmDialog.jsx";

import { useSchool } from "../../../contexts/SchoolContext.jsx";
import { activateCurriculum, getCurriculumList, upsertCurriculum } from "../../../services/CurriculumService.jsx";

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
const HEADER_ACCENT = "#0D64DE";

const CURRICULUM_TYPE_OPTIONS = ["INTEGRATED", "NATIONAL", "INTERNATIONAL"];
const METHOD_LEARNING_OPTIONS = [
    "PROJECT_BASED",
    "COOPERATIVE",
    "EXPERIENTIAL",
    "PROBLEM_BASED",
    "PERSONALIZED",
    "BLENDED",
    "VISUAL_PRACTICE",
    "STEM_STEAM",
];

/** Đồng bộ với LearningMethod.valueOf(...toUpperCase()) trên BE. */
function isValidLearningMethodCode(m) {
    const code = String(m ?? "")
        .trim()
        .toUpperCase();
    if (!code) return false;
    return METHOD_LEARNING_OPTIONS.includes(code);
}
const CURRICULUM_STATUS_OPTIONS = ["CUR_ACTIVE", "CUR_DRAFT", "CUR_ARCHIVED"];

const curriculumTypeI18N = {
    NATIONAL: "Quốc gia",
    INTERNATIONAL: "Quốc tế",
    INTEGRATED: "Tích hợp",
};

const methodLearningI18N = {
    PROJECT_BASED: "Dạy học dựa trên dự án",
    COOPERATIVE: "Dạy học hợp tác",
    EXPERIENTIAL: "Dạy học qua trải nghiệm",
    PROBLEM_BASED: "Dạy học giải quyết vấn đề",
    PERSONALIZED: "Cá nhân hóa học tập",
    BLENDED: "Dạy học tích hợp/Trực tuyến",
    VISUAL_PRACTICE: "Dạy học trực quan và thực hành",
    STEM_STEAM: "Tích hợp STEM/STEAM",
};
const methodLearningDescriptionI18N = {
    PROJECT_BASED: "Học sinh thực hiện dự án thực tế để giải quyết vấn đề và nâng cao kỹ năng thực hành.",
    COOPERATIVE: "Tăng cường làm việc nhóm, trao đổi và tương tác giữa các học sinh.",
    EXPERIENTIAL: "Học thông qua các hoạt động tham quan, thực hành và mô phỏng thực tế.",
    PROBLEM_BASED: "Học sinh thảo luận để tìm lời giải cho các tình huống thực tế do giáo viên đưa ra.",
    PERSONALIZED: "Thiết kế lộ trình học tập riêng, phù hợp với năng lực và nhu cầu từng học sinh.",
    BLENDED: "Kết hợp học trực tiếp tại lớp với học trực tuyến qua các nền tảng số.",
    VISUAL_PRACTICE: "Sử dụng hình ảnh, mô hình và luyện tập trực tiếp để tăng khả năng ghi nhớ.",
    STEM_STEAM: "Tích hợp Khoa học, Công nghệ, Kỹ thuật, Nghệ thuật và Toán học theo hướng liên môn.",
};
const methodLearningIconMap = {
    PROJECT_BASED: HandymanIcon,
    COOPERATIVE: GroupsIcon,
    EXPERIENTIAL: ExploreIcon,
    PROBLEM_BASED: ScienceIcon,
    PERSONALIZED: PersonIcon,
    BLENDED: ComputerIcon,
    VISUAL_PRACTICE: VisibilityIconOutlined,
    STEM_STEAM: MenuBookIcon,
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
const currentYear = new Date().getFullYear();
const minApplicationYear = currentYear - 2;
const maxApplicationYear = currentYear + 5;

const toCurriculumTypeLabel = (value) => curriculumTypeI18N[value] ?? value ?? "—";

const toMethodLearningLabel = (value) => methodLearningI18N[value] ?? value ?? "—";
const toMethodLearningListLabel = (methodLearningList) => {
    const list = Array.isArray(methodLearningList) ? methodLearningList : [];
    if (list.length === 0) return "—";
    return list.map((m) => toMethodLearningLabel(m)).join(", ");
};

const subjectEmpty = () => ({
    name: "",
    description: "",
    /** Môn trong curriculum luôn bắt buộc — không cho phép tắt (đồng bộ BE). */
    isMandatory: true,
});

const emptyForm = () => ({
    subTypeName: "",
    description: "",
    curriculumType: "",
    methodLearningList: [],
    applicationYear: "",
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
        methodLearningList: Array.isArray(item.methodLearnings)
            ? item.methodLearnings.map((m) => m?.code).filter(Boolean)
            : Array.isArray(item.methodLearningList)
                ? item.methodLearningList.filter(Boolean)
                : item.methodLearning
                    ? [item.methodLearning]
                    : [],
        applicationYear: item.applicationYear ?? item.enrollmentYear,
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
        updatedAt: item.updatedAt ?? item.modifiedAt ?? item.lastModifiedAt ?? null,
        createdAt: item.createdAt ?? null,
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
        isMandatory: true,
    }));
}

function toVietnameseValidationMessage(rawMessage) {
    const msg = String(rawMessage || "").trim();
    if (!msg) return "";

    const immutableYear = msg.match(/^Cannot change enrollment year because (\d+) programs are using this curriculum\.$/);
    if (immutableYear) {
        return `Không thể thay đổi năm áp dụng vì có ${immutableYear[1]} chương trình đang sử dụng khung chương trình này.`;
    }

    const immutableYearVi = msg.match(/^Không thể thay đổi năm áp dụng vì có (\d+) chương trình đang sử dụng khung chương trình này\.$/);
    if (immutableYearVi) return msg;

    const yearRange = msg.match(/^Enrollment year must be between (\d+) and (\d+)$/);
    if (yearRange) return `Năm áp dụng phải nằm trong khoảng từ ${yearRange[1]} đến ${yearRange[2]}`;

    const yearRangeVi = msg.match(/^Năm áp dụng phải nằm trong khoảng từ (\d+) đến (\d+)$/);
    if (yearRangeVi) return msg;

    const subjectNameTooLong = msg.match(/^Subject name '(.+)' is too long \(max 100\)\.$/);
    if (subjectNameTooLong) return `Tên môn học '${subjectNameTooLong[1]}' quá dài (tối đa 100 ký tự).`;

    const subjectNameTooLongVi = msg.match(/^Tên môn học '(.+)' quá dài \(tối đa 100 ký tự\)\.$/);
    if (subjectNameTooLongVi) return msg;

    const duplicateSubject = msg.match(/^Duplicate subject name found: (.+)$/);
    if (duplicateSubject) return `Phát hiện tên môn học bị trùng lặp: ${duplicateSubject[1]}`;

    const duplicateSubjectVi = msg.match(/^Phát hiện tên môn học bị trùng lặp: (.+)$/);
    if (duplicateSubjectVi) return msg;

    const subjectDescRequired = msg.match(/^Description for subject '(.+)' is required\.$/);
    if (subjectDescRequired) return `Mô tả cho môn học '${subjectDescRequired[1]}' không được để trống.`;

    const subjectDescTooLong = msg.match(/^Description for subject '(.+)' is too long \(max 1000\)\.$/);
    if (subjectDescTooLong) return `Mô tả cho môn học '${subjectDescTooLong[1]}' quá dài (tối đa 1000 ký tự).`;

    const subjectDescRequiredVi = msg.match(/^Mô tả cho môn học '(.+)' không được để trống\.$/);
    if (subjectDescRequiredVi) return msg;

    const subjectDescTooLongVi = msg.match(/^Mô tả cho môn học '(.+)' quá dài \(tối đa 1000 ký tự\)\.$/);
    if (subjectDescTooLongVi) return msg;

    const dictionary = {
        "Curriculum not found.": "Không tìm thấy khung chương trình.",
        "Cannot update an archived curriculum. Please create a new version or use an active one.":
            "Không thể cập nhật khung chương trình đã được lưu trữ. Vui lòng tạo phiên bản mới hoặc sử dụng bản đang hoạt động.",
        "Cannot change curriculum type for a curriculum already linked to programs.":
            "Không thể thay đổi loại chương trình khi đã có chương trình đào tạo liên kết.",
        "Cannot change sub-type name for a curriculum already linked to programs.":
            "Không thể thay đổi tên phân loại phụ (Sub-type) khi đã có chương trình đào tạo liên kết.",
        "A curriculum with the same type, year, and sub-type already exists (Draft or Active).":
            "Khung chương trình có cùng loại, năm và phân loại phụ này đã tồn tại (ở dạng Nháp hoặc Đang hoạt động).",
        "New draft created. Please update your changes.": "Đã tạo bản nháp mới. Vui lòng cập nhật nội dung chỉnh sửa của bạn.",
        "Updated draft successfully": "Cập nhật bản nháp thành công.",
        "Published successfully": "Công bố thành công.",
        "Sub-type name is required.": "Tên phân loại phụ (Sub-type) không được để trống.",
        "Sub-type name is too long (max 50 chars).": "Tên phân loại phụ quá dài (tối đa 50 ký tự).",
        "Invalid Curriculum Type or Learning Method.": "Loại chương trình hoặc Phương thức học tập không hợp lệ.",
        "The curriculum must contain at least one subject.": "Khung chương trình phải chứa ít nhất một môn học.",
        "A curriculum cannot have more than 50 subjects.": "Một khung chương trình không thể có quá 50 môn học.",
        "Subject name cannot be empty.": "Tên môn học không được để trống.",
        "The curriculum must have at least one mandatory subject.": "Khung chương trình phải có ít nhất một môn học bắt buộc.",
        // Thông điệp tiếng Việt từ CurriculumValidation (BE)
        "Không tìm thấy khung chương trình.": "Không tìm thấy khung chương trình.",
        "Không thể cập nhật khung chương trình đã được lưu trữ. Vui lòng tạo phiên bản mới hoặc sử dụng bản đang hoạt động.":
            "Không thể cập nhật khung chương trình đã được lưu trữ. Vui lòng tạo phiên bản mới hoặc sử dụng bản đang hoạt động.",
        "Không thể thay đổi loại chương trình khi đã có chương trình đào tạo liên kết.":
            "Không thể thay đổi loại chương trình khi đã có chương trình đào tạo liên kết.",
        "Không thể thay đổi tên phân loại phụ (Sub-type) khi đã có chương trình đào tạo liên kết.":
            "Không thể thay đổi tên phân loại phụ (Sub-type) khi đã có chương trình đào tạo liên kết.",
        "Khung chương trình có cùng loại, năm và phân loại phụ này đã tồn tại (ở dạng Nháp hoặc Đang hoạt động).":
            "Khung chương trình có cùng loại, năm và phân loại phụ này đã tồn tại (ở dạng Nháp hoặc Đang hoạt động).",
        "Tên phân loại phụ (Sub-type) không được để trống.": "Tên phân loại phụ (Sub-type) không được để trống.",
        "Tên phân loại phụ quá dài (tối đa 50 ký tự).": "Tên phân loại phụ quá dài (tối đa 50 ký tự).",
        "Yêu cầu ít nhất một phương thức học tập.": "Yêu cầu ít nhất một phương thức học tập.",
        "Loại chương trình hoặc Phương thức học tập không hợp lệ.": "Loại chương trình hoặc Phương thức học tập không hợp lệ.",
        "Khung chương trình phải chứa ít nhất một môn học.": "Khung chương trình phải chứa ít nhất một môn học.",
        "Một khung chương trình không thể có quá 50 môn học.": "Một khung chương trình không thể có quá 50 môn học.",
        "Tên môn học không được để trống.": "Tên môn học không được để trống.",
        "Khung chương trình phải có ít nhất một môn học bắt buộc.": "Khung chương trình phải có ít nhất một môn học bắt buộc.",
    };
    if (dictionary[msg]) return dictionary[msg];
    if (msg.startsWith("Tên môn học '") && msg.includes("' quá dài (tối đa 100 ký tự)")) return msg;
    if (msg.startsWith("Năm áp dụng phải nằm trong khoảng từ ")) return msg;
    if (msg.startsWith("Không thể thay đổi năm áp dụng vì có ")) return msg;
    return msg;
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
    const [applicationYearFilter, setApplicationYearFilter] = useState("all");
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
    const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);
    const [curriculumToEditAfterConfirm, setCurriculumToEditAfterConfirm] = useState(null);
    const [activeLockedChoiceOpen, setActiveLockedChoiceOpen] = useState(false);
    const [selectedActiveLockedOption, setSelectedActiveLockedOption] = useState("");
    const [programLinkedBlockedOpen, setProgramLinkedBlockedOpen] = useState(false);
    const [pendingScrollSubjectIndex, setPendingScrollSubjectIndex] = useState(null);
    const [pendingScrollModal, setPendingScrollModal] = useState(null);
    const createSubjectItemRefs = useRef({});
    const editSubjectItemRefs = useRef({});

    const [formValues, setFormValues] = useState(emptyForm());
    const [formErrors, setFormErrors] = useState({});

    const applicationYearOptions = useMemo(() => {
        const set = new Set(curriculums.map((c) => c.applicationYear).filter((y) => y !== null && y !== undefined));
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

        if (applicationYearFilter !== "all") {
            const y = Number(applicationYearFilter);
            list = list.filter((c) => Number(c.applicationYear) === y);
        }

        if (publishStatusFilter !== "all") {
            list = list.filter((c) => normalizeStatus(c.curriculumStatus) === publishStatusFilter);
        }

        const toEpoch = (value) => {
            if (!value) return null;
            const t = new Date(value).getTime();
            return Number.isNaN(t) ? null : t;
        };

        return [...list].sort((a, b) => {
            const aUpdated = toEpoch(a.updatedAt);
            const bUpdated = toEpoch(b.updatedAt);

            if (aUpdated !== null && bUpdated !== null && aUpdated !== bUpdated) {
                return bUpdated - aUpdated;
            }
            if (aUpdated !== null && bUpdated === null) return -1;
            if (aUpdated === null && bUpdated !== null) return 1;

            const aCreated = toEpoch(a.createdAt);
            const bCreated = toEpoch(b.createdAt);
            if (aCreated !== null && bCreated !== null && aCreated !== bCreated) {
                return bCreated - aCreated;
            }
            if (aCreated !== null && bCreated === null) return -1;
            if (aCreated === null && bCreated !== null) return 1;

            return Number(b.id ?? 0) - Number(a.id ?? 0);
        });
    }, [curriculums, search, curriculumTypeFilter, applicationYearFilter, publishStatusFilter]);

    const paginatedCurriculums = filteredCurriculums;

    const validateForm = () => {
        const errors = {};
        const subjectErrors = (formValues.subjectOptions || []).map(() => ({}));
        const normalizedSubType = String(formValues.subTypeName || "").trim();
        const normalizedCurriculumType = String(formValues.curriculumType || "").trim().toUpperCase();
        const methodLearningList = Array.isArray(formValues.methodLearningList) ? formValues.methodLearningList : [];
        const yearNumber = Number(formValues.applicationYear);

        const isEdit = editModalOpen && selectedCurriculum != null;
        if (isEdit && normalizeStatus(selectedCurriculum.curriculumStatus) === "CUR_ARCHIVED") {
            errors.form =
                "Không thể cập nhật khung chương trình đã được lưu trữ. Vui lòng tạo phiên bản mới hoặc sử dụng bản đang hoạt động.";
        }

        if (!normalizedSubType) errors.subTypeName = "Tên phân loại phụ (Sub-type) không được để trống.";
        else if (normalizedSubType.length > 50) errors.subTypeName = "Tên phân loại phụ quá dài (tối đa 50 ký tự).";

        if (!normalizedCurriculumType) errors.curriculumType = "Loại chương trình là bắt buộc";
        else if (!CURRICULUM_TYPE_OPTIONS.includes(normalizedCurriculumType)) errors.curriculumType = "Loại chương trình không hợp lệ.";

        if (methodLearningList.length === 0) errors.methodLearningList = "Yêu cầu ít nhất một phương thức học tập.";
        else if (methodLearningList.some((m) => !isValidLearningMethodCode(m)))
            errors.methodLearningList = "Loại chương trình hoặc Phương thức học tập không hợp lệ.";

        if (formValues.applicationYear === "" || Number.isNaN(yearNumber)) {
            errors.applicationYear = "Năm áp dụng là bắt buộc";
        } else if (yearNumber < minApplicationYear || yearNumber > maxApplicationYear) {
            errors.applicationYear = `Năm áp dụng phải nằm trong khoảng từ ${minApplicationYear} đến ${maxApplicationYear}`;
        }

        const linked = isEdit ? Number(selectedCurriculum.programCount || 0) : 0;
        if (linked > 0) {
            const origYear = Number(selectedCurriculum.applicationYear);
            if (Number.isFinite(yearNumber) && Number.isFinite(origYear) && yearNumber !== origYear) {
                errors.applicationYear = `Không thể thay đổi năm áp dụng vì có ${linked} chương trình đang sử dụng khung chương trình này.`;
            }
            const origType = String(selectedCurriculum.curriculumType || "").trim().toUpperCase();
            if (origType && normalizedCurriculumType && origType !== normalizedCurriculumType) {
                errors.curriculumType = "Không thể thay đổi loại chương trình khi đã có chương trình đào tạo liên kết.";
            }
            const origSub = stripLeadingHePrefix(String(selectedCurriculum.subTypeName || "").trim());
            const curSub = stripLeadingHePrefix(normalizedSubType);
            if (origSub !== curSub) {
                errors.subTypeName = "Không thể thay đổi tên phân loại phụ (Sub-type) khi đã có chương trình đào tạo liên kết.";
            }
        }

        const subjects = formValues.subjectOptions || [];
        if (subjects.length === 0) {
            errors.subjectOptions = "Khung chương trình phải chứa ít nhất một môn học.";
        } else if (subjects.length > 50) {
            errors.subjectOptions = "Một khung chương trình không thể có quá 50 môn học.";
        } else {
            const subjectNames = new Set();
            subjects.forEach((s, idx) => {
                const sName = String(s.name || "").trim();
                const sDesc = String(s.description || "").trim();

                if (!sName) {
                    subjectErrors[idx].name = "Tên môn học không được để trống.";
                } else {
                    if (sName.length > 100) subjectErrors[idx].name = `Tên môn học '${sName}' quá dài (tối đa 100 ký tự).`;
                    else {
                        const lower = sName.toLowerCase();
                        if (subjectNames.has(lower)) subjectErrors[idx].name = `Phát hiện tên môn học bị trùng lặp: ${sName}`;
                        else subjectNames.add(lower);
                    }
                    if (!sDesc) subjectErrors[idx].description = `Mô tả cho môn học '${sName}' không được để trống.`;
                    else if (sDesc.length > 1000)
                        subjectErrors[idx].description = `Mô tả cho môn học '${sName}' quá dài (tối đa 1000 ký tự).`;
                }
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
        curriculumType: String(formValues.curriculumType || "").trim().toUpperCase(),
        methodLearningList: (formValues.methodLearningList || []).map((m) => String(m).trim().toUpperCase()).filter(Boolean),
        applicationYear: Number(formValues.applicationYear),
        subjectOptions: mapSubjectOptionsForApi(formValues.subjectOptions),
    });

    const getUpdatePayload = () => ({
        curriculumId: selectedCurriculum?.id,
        ...getCreatePayload(),
    });

    const handleOpenCreate = () => {
        if (!isPrimaryBranch) return;
        setProgramLinkedBlockedOpen(false);
        setActiveLockedChoiceOpen(false);
        setSelectedActiveLockedOption("");
        setCurriculumToEditAfterConfirm(null);
        setSelectedCurriculum(null);
        setViewCurriculum(null);
        setFormErrors({});
        setPendingScrollSubjectIndex(null);
        setPendingScrollModal(null);
        setFormValues({
            ...emptyForm(),
            curriculumType: "",
            methodLearningList: [],
            applicationYear: new Date().getFullYear(),
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
            methodLearningList: Array.isArray(curriculum?.methodLearningList) ? curriculum.methodLearningList : [],
            applicationYear: curriculum?.applicationYear ?? "",
            subjectOptions:
                Array.isArray(curriculum?.subjects) && curriculum.subjects.length > 0
                    ? curriculum.subjects.map((s) => ({
                        name: s.name || "",
                        description: s.description || "",
                        isMandatory: true,
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
            enqueueSnackbar(
                "Không thể cập nhật khung chương trình đã được lưu trữ. Vui lòng tạo phiên bản mới hoặc sử dụng bản đang hoạt động.",
                { variant: "warning" }
            );
            return;
        }
        const statusKey = normalizeStatus(curriculum?.curriculumStatus);
        const linkedProgramCount = Number(curriculum?.programCount || 0);

        if (linkedProgramCount > 0) {
            setCurriculumToEditAfterConfirm(curriculum);
            setProgramLinkedBlockedOpen(true);
            return;
        }

        if (statusKey === "CUR_ACTIVE") {
            setCurriculumToEditAfterConfirm(curriculum);
            setSelectedActiveLockedOption("");
            setActiveLockedChoiceOpen(true);
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
            const reviseRes = await activateCurriculum(base.id, "REVISE");
            const newDraftId = reviseRes?.data?.body ?? extractCurriculumIdFromResponse(reviseRes);
            if (!newDraftId) {
                enqueueSnackbar(
                    toVietnameseValidationMessage(reviseRes?.data?.message) ||
                        "Đã tạo bản nháp mới nhưng không lấy được ID để mở chỉnh sửa.",
                    { variant: "warning" }
                );
                return;
            }
            const draftCurriculum = { ...base, id: newDraftId, curriculumStatus: "CUR_DRAFT" };
            handleOpenEdit(draftCurriculum);
            enqueueSnackbar(
                toVietnameseValidationMessage(reviseRes?.data?.message) || "Đã tạo bản nháp mới. Bạn có thể chỉnh sửa ngay bây giờ.",
                { variant: "success" }
            );
            setCurriculumToEditAfterConfirm(null);
        } catch (err) {
            console.error("Evolve curriculum error:", err);
            enqueueSnackbar(
                toVietnameseValidationMessage(err?.response?.data?.message) || "Lỗi khi tạo bản nháp từ curriculum đang hoạt động.",
                { variant: "error" }
            );
        } finally {
            setEvolveLoading(false);
            setActiveLockedChoiceOpen(false);
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
            const actRes = await activateCurriculum(viewCurriculum.id, "PUBLISH");
            enqueueSnackbar(toVietnameseValidationMessage(actRes?.data?.message) || "Công bố chương trình thành công", { variant: "success" });
            setViewModalOpen(false);
            setViewCurriculum(null);
            setConfirmPublishOpen(false);
            await loadData(page, rowsPerPage);
        } catch (err) {
            console.error("Publish curriculum error:", err);
            enqueueSnackbar(toVietnameseValidationMessage(err?.response?.data?.message) || "Lỗi khi công bố curriculum", { variant: "error" });
        } finally {
            setPublishLoading(false);
        }
    };

    const handleCreateSubmit = async () => {
        if (!isPrimaryBranch) return;
        if (!validateForm()) return;
        setSubmitLoading(true);
        try {
            const payload = getCreatePayload();
            const draftRes = await upsertCurriculum(payload);
            enqueueSnackbar(toVietnameseValidationMessage(draftRes?.data?.message) || "Tạo bản nháp curriculum thành công", { variant: "success" });

            setCreateModalOpen(false);
            setFormErrors({});
            setPage(0);
            await loadData(0, rowsPerPage);
        } catch (err) {
            console.error("Create curriculum error:", err);
            enqueueSnackbar(toVietnameseValidationMessage(err?.response?.data?.message) || "Lỗi khi tạo curriculum", { variant: "error" });
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleEditSubmit = async () => {
        if (!isPrimaryBranch) return;
        if (!selectedCurriculum) return;
        if (!validateForm()) return;
        setSubmitLoading(true);
        try {
            const payload = getUpdatePayload();
            const draftRes = await upsertCurriculum(payload);

            enqueueSnackbar(toVietnameseValidationMessage(draftRes?.data?.message) || "Cập nhật bản nháp thành công", { variant: "success" });

            setEditModalOpen(false);
            setFormErrors({});
            setSelectedCurriculum(null);
            await loadData(page, rowsPerPage);
        } catch (err) {
            console.error("Update curriculum error:", err);
            enqueueSnackbar(toVietnameseValidationMessage(err?.response?.data?.message) || "Lỗi khi cập nhật curriculum", { variant: "error" });
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleBasicChange = (e) => {
        const { name, value } = e.target;
        setFormValues((prev) => {
            if (name === "applicationYear") {
                return { ...prev, applicationYear: value === "" ? "" : parseInt(value, 10) };
            }
            return { ...prev, [name]: value };
        });
    };

    const handleToggleMethodLearning = (method) => {
        setFormValues((prev) => {
            const current = Array.isArray(prev.methodLearningList) ? prev.methodLearningList : [];
            const exists = current.includes(method);
            return {
                ...prev,
                methodLearningList: exists ? current.filter((m) => m !== method) : [...current, method],
            };
        });
        setFormErrors((prev) => ({ ...prev, methodLearningList: undefined }));
    };

    const handleRemoveMethodLearningChip = (method) => {
        setFormValues((prev) => ({
            ...prev,
            methodLearningList: (prev.methodLearningList || []).filter((m) => m !== method),
        }));
    };

    const renderMethodLearningCardSelector = (disabled = false) => (
        <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography sx={{ fontWeight: 800, color: "#1e293b" }}>
                    Phương pháp học
                </Typography>
                <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700 }}>
                    Được chọn nhiều phương pháp
                </Typography>
            </Stack>

            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 1.5 }}>
                {(formValues.methodLearningList || []).length > 0 ? (
                    (formValues.methodLearningList || []).map((method) => (
                        <Chip
                            key={method}
                            label={toMethodLearningLabel(method)}
                            onDelete={disabled ? undefined : () => handleRemoveMethodLearningChip(method)}
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
                        Chưa chọn phương pháp học nào
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
                {METHOD_LEARNING_OPTIONS.map((method) => {
                    const selected = (formValues.methodLearningList || []).includes(method);
                    const IconComp = methodLearningIconMap[method] || MenuBookIcon;
                    return (
                        <Tooltip key={method} title={methodLearningDescriptionI18N[method] || ""} arrow placement="top">
                            <Box
                                role="checkbox"
                                aria-checked={selected}
                                aria-label={toMethodLearningLabel(method)}
                                tabIndex={disabled ? -1 : 0}
                                onClick={() => {
                                    if (!disabled) handleToggleMethodLearning(method);
                                }}
                                onKeyDown={(e) => {
                                    if (disabled) return;
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        handleToggleMethodLearning(method);
                                    }
                                }}
                                sx={{
                                    position: "relative",
                                    p: 1.5,
                                    minHeight: 120,
                                    borderRadius: 3,
                                    border: selected ? "1.5px solid #0D64DE" : "1px solid #e2e8f0",
                                    bgcolor: selected ? "rgba(13, 100, 222, 0.07)" : "rgba(255,255,255,0.8)",
                                    boxShadow: selected ? "0 8px 20px rgba(13, 100, 222, 0.16)" : "0 4px 12px rgba(15, 23, 42, 0.06)",
                                    cursor: disabled ? "not-allowed" : "pointer",
                                    transition: "all 180ms ease",
                                    backdropFilter: "blur(4px)",
                                    "&:hover": disabled
                                        ? {}
                                        : {
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
                                {selected && (
                                    <CheckCircleIcon
                                        sx={{
                                            position: "absolute",
                                            top: 8,
                                            right: 8,
                                            fontSize: 18,
                                            color: "#0D64DE",
                                        }}
                                    />
                                )}
                                <Box
                                    sx={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: 2,
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        bgcolor: selected ? "rgba(13, 100, 222, 0.16)" : "rgba(148, 163, 184, 0.15)",
                                        color: selected ? "#0D64DE" : "#64748b",
                                    }}
                                >
                                    <IconComp sx={{ fontSize: 18 }} />
                                </Box>
                                <Typography sx={{ mt: 1.2, fontWeight: 800, color: "#1e293b", fontSize: 13.5, lineHeight: 1.3 }}>
                                    {toMethodLearningLabel(method)}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        mt: 0.8,
                                        display: "-webkit-box",
                                        overflow: "hidden",
                                        color: "#64748b",
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: "vertical",
                                        lineHeight: 1.4,
                                    }}
                                >
                                    {methodLearningDescriptionI18N[method]}
                                </Typography>
                            </Box>
                        </Tooltip>
                    );
                })}
            </Box>

            {formErrors.methodLearningList ? (
                <Typography variant="caption" sx={{ color: "#d32f2f", ml: 0.2, mt: 1, display: "block" }}>
                    {formErrors.methodLearningList}
                </Typography>
            ) : null}
        </Box>
    );

    const handleSubjectChange = (idx, field) => (e) => {
        const value = e.target.value;
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

    const isEditFieldsLocked = selectedCurriculum?.canEditIdentity === false || (selectedCurriculum?.programCount ?? 0) > 0;

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
                            <InputLabel>Năm áp dụng</InputLabel>
                            <Select
                                value={applicationYearFilter}
                                label="Năm áp dụng"
                                onChange={(e) => {
                                    setApplicationYearFilter(e.target.value);
                                    setPage(0);
                                }}
                                sx={{ borderRadius: 2, bgcolor: "white" }}
                            >
                                <MenuItem value="all">Tất cả</MenuItem>
                                {applicationYearOptions.map((y) => (
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
                                <TableCell sx={{ fontWeight: 700, color: "#1e293b", py: 2 }}>Năm áp dụng</TableCell>
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
                                        <TableCell sx={{ color: "#64748b" }}>{row.applicationYear}</TableCell>
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

            {/* Block Update When Program Linked */}
            <Dialog
                open={programLinkedBlockedOpen}
                onClose={(event, reason) => {
                    if (reason === "backdropClick") return;
                    if (evolveLoading) return;
                    setProgramLinkedBlockedOpen(false);
                    setCurriculumToEditAfterConfirm(null);
                }}
                fullWidth
                maxWidth="sm"
                PaperProps={{ sx: { borderRadius: "16px", position: "relative" } }}
            >
                <DialogContent sx={{ pt: 2.5 }}>
                    <Stack direction="row" spacing={1.2} alignItems="center">
                        <WarningAmberRoundedIcon sx={{ color: "red" }} />
                        <Typography variant="h6" sx={{ fontWeight: 700, color: "red" }}>
                            Không thể cập nhật Curriculum
                        </Typography>
                    </Stack>
                    <Typography variant="body1" color="#1e293b" sx={{ mt: 1.25, lineHeight: 1.6 }}>
                        Không thể cập nhật khi Khung chương trình <Box component="span" sx={{ fontWeight: 700 }}>đang trong trạng thái mở</Box> và{" "}
                        <Box component="span" sx={{ fontWeight: 700 }}>đã có Program</Box>.
                    </Typography>
                    <Typography variant="body1" sx={{ mt: 0.35, lineHeight: 1.6, fontWeight: 700, color: "#1e293b" }}>
                        Vui lòng tạo mới Khung chương trình.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5, gap: 1, flexWrap: "wrap" }}>
                    <Button
                        onClick={() => {
                            setProgramLinkedBlockedOpen(false);
                            setCurriculumToEditAfterConfirm(null);
                        }}
                        disabled={evolveLoading}
                        sx={{ textTransform: "none", color: "#64748b" }}
                    >
                        Đóng
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleOpenCreate}
                        disabled={evolveLoading}
                        sx={{ textTransform: "none", fontWeight: 600, borderRadius: "12px", bgcolor: HEADER_ACCENT }}
                    >
                        Tạo Khung chương trình
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Active Curriculum Update Options */}
            <Dialog
                open={activeLockedChoiceOpen}
                onClose={(event, reason) => {
                    if (reason === "backdropClick") return;
                    if (evolveLoading) return;
                    setActiveLockedChoiceOpen(false);
                    setSelectedActiveLockedOption("");
                    setCurriculumToEditAfterConfirm(null);
                }}
                fullWidth
                maxWidth="sm"
                PaperProps={{ sx: { borderRadius: "16px" } }}
            >
                <DialogContent sx={{ pt: 2.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Không thể cập nhật Curriculum
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25, lineHeight: 1.6 }}>
                        Không thể cập nhật khi Khung chương trình đang trong trạng thái mở. Vui lòng chọn 2 options dưới đây.
                    </Typography>
                    <Stack spacing={1.5} sx={{ mt: 2 }}>
                        <Card
                            elevation={0}
                            onClick={() => setSelectedActiveLockedOption("create")}
                            sx={{
                                p: 2,
                                borderRadius: "12px",
                                border: "2px solid",
                                borderColor: selectedActiveLockedOption === "create" ? HEADER_ACCENT : "transparent",
                                cursor: "pointer",
                                backgroundColor: selectedActiveLockedOption === "create" ? "rgba(13, 100, 222, 0.08)" : "#fff",
                                boxShadow:
                                    selectedActiveLockedOption === "create"
                                        ? "0 0 0 1px rgba(13, 100, 222, 0.15)"
                                        : "0 0 0 1px #e2e8f0",
                                transition: "all 0.2s ease",
                            }}
                        >
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1e293b" }}>
                                Option 1
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.5, color: "#475569" }}>
                                Bạn có muốn Tạo khung chương trình mới
                            </Typography>
                        </Card>
                        <Card
                            elevation={0}
                            onClick={() => setSelectedActiveLockedOption("revise")}
                            sx={{
                                p: 2,
                                borderRadius: "12px",
                                border: "2px solid",
                                borderColor: selectedActiveLockedOption === "revise" ? HEADER_ACCENT : "transparent",
                                cursor: "pointer",
                                backgroundColor: selectedActiveLockedOption === "revise" ? "rgba(13, 100, 222, 0.08)" : "#fff",
                                boxShadow:
                                    selectedActiveLockedOption === "revise"
                                        ? "0 0 0 1px rgba(13, 100, 222, 0.15)"
                                        : "0 0 0 1px #e2e8f0",
                                transition: "all 0.2s ease",
                            }}
                        >
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1e293b" }}>
                                Option 2
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.5, color: "#475569" }}>
                                Bạn vẫn muốn giữ dữ liệu của khung chương trình hiện tại để clone cập nhật
                            </Typography>
                        </Card>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5, gap: 1, flexWrap: "wrap" }}>
                    <Button
                        onClick={() => {
                            if (evolveLoading) return;
                            setActiveLockedChoiceOpen(false);
                            setSelectedActiveLockedOption("");
                            setCurriculumToEditAfterConfirm(null);
                        }}
                        disabled={evolveLoading}
                        sx={{ textTransform: "none", color: "#64748b" }}
                    >
                        Đóng
                    </Button>
                    <Button
                        variant="contained"
                        onClick={async () => {
                            if (!selectedActiveLockedOption) return;
                            if (selectedActiveLockedOption === "create") {
                                setActiveLockedChoiceOpen(false);
                                setSelectedActiveLockedOption("");
                                setCurriculumToEditAfterConfirm(null);
                                handleOpenCreate();
                                return;
                            }
                            await handleConfirmEvolve();
                            setSelectedActiveLockedOption("");
                        }}
                        disabled={evolveLoading || !selectedActiveLockedOption}
                        sx={{ textTransform: "none", fontWeight: 600, borderRadius: "12px", bgcolor: HEADER_ACCENT }}
                    >
                        {evolveLoading ? "Đang xử lý..." : "Tiếp tục"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* View Curriculum Dialog */}
            <Dialog
                open={viewModalOpen}
                onClose={(event, reason) => {
                    if (reason === "backdropClick") return;
                    if (publishLoading) return;
                    setViewModalOpen(false);
                    setConfirmPublishOpen(false);
                }}
                maxWidth="md"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3, overflow: "hidden", position: "relative" } }}
                slotProps={{ backdrop: { sx: modalBackdropSx } }}
            >
                <IconButton
                    aria-label="Đóng"
                    onClick={() => {
                        if (publishLoading) return;
                        setViewModalOpen(false);
                        setConfirmPublishOpen(false);
                    }}
                    disabled={publishLoading}
                    sx={{
                        position: "absolute",
                        right: 8,
                        top: 8,
                        zIndex: 2,
                        bgcolor: "#f1f5f9",
                        "&:hover": { bgcolor: "#e2e8f0", boxShadow: "0 8px 16px rgba(2, 6, 23, 0.06)" },
                    }}
                    size="small"
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
                <DialogTitle sx={{ px: 3, pt: 2.5, pb: 1.5, pr: 6 }}>
                    {viewCurriculum && (() => {
                        return (
                            <Typography sx={{ fontWeight: 900, color: "#1e293b", fontSize: 22, lineHeight: 1.2 }}>
                                Chi tiết chương trình
                            </Typography>
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
                                            label: "Năm áp dụng",
                                            value: viewCurriculum.applicationYear ?? "—",
                                            wide: true,
                                        },
                                    ].map((item, idx) => (
                                        <Box
                                            key={`${item.label}-${idx}`}
                                            sx={{
                                                gridColumn: item.wide ? { xs: "1 / -1", sm: "1 / -1" } : "auto",
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

                                <Card
                                    elevation={0}
                                    sx={{
                                        bgcolor: "#ffffff",
                                        border: "1px solid rgba(226, 232, 240, 1)",
                                        borderRadius: 3,
                                        boxShadow: "0 6px 20px rgba(2, 6, 23, 0.04)",
                                    }}
                                >
                                    <CardContent sx={{ p: 2.5 }}>
                                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.6 }}>
                                            <Typography sx={{ fontWeight: 950, color: "#1e293b", fontSize: 16 }}>Phương pháp học</Typography>
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    px: 1.1,
                                                    py: 0.4,
                                                    borderRadius: 999,
                                                    fontWeight: 800,
                                                    color: "#0D64DE",
                                                    bgcolor: "rgba(13, 100, 222, 0.1)",
                                                }}
                                            >
                                                {(viewCurriculum.methodLearningList || []).length} phương pháp
                                            </Typography>
                                        </Stack>

                                        {(viewCurriculum.methodLearningList || []).length > 0 ? (
                                            <Box
                                                sx={{
                                                    display: "grid",
                                                    gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" },
                                                    gap: 1.6,
                                                }}
                                            >
                                                {(viewCurriculum.methodLearningList || []).map((method) => {
                                                    const IconComp = methodLearningIconMap[method] || MenuBookIcon;
                                                    return (
                                                        <Tooltip key={method} title={methodLearningDescriptionI18N[method] || ""} arrow placement="top">
                                                            <Box
                                                                sx={{
                                                                    height: "100%",
                                                                    minHeight: 120,
                                                                    borderRadius: 3,
                                                                    border: "1px solid rgba(226, 232, 240, 1)",
                                                                    bgcolor: "linear-gradient(145deg, #ffffff 0%, #f8fbff 100%)",
                                                                    px: 1.6,
                                                                    py: 1.4,
                                                                    boxShadow: "0 4px 14px rgba(15, 23, 42, 0.05)",
                                                                    transition: "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
                                                                    "&:hover": {
                                                                        transform: "translateY(-2px)",
                                                                        boxShadow: "0 14px 28px rgba(2, 6, 23, 0.10)",
                                                                        borderColor: "rgba(13, 100, 222, 0.28)",
                                                                    },
                                                                }}
                                                            >
                                                                <Box
                                                                    sx={{
                                                                        width: 34,
                                                                        height: 34,
                                                                        borderRadius: 2,
                                                                        display: "inline-flex",
                                                                        alignItems: "center",
                                                                        justifyContent: "center",
                                                                        bgcolor: "rgba(13, 100, 222, 0.1)",
                                                                        color: "#0D64DE",
                                                                    }}
                                                                >
                                                                    <IconComp sx={{ fontSize: 18 }} />
                                                                </Box>
                                                                <Typography sx={{ mt: 1.1, fontWeight: 850, color: "#1e293b", lineHeight: 1.35 }}>
                                                                    {toMethodLearningLabel(method)}
                                                                </Typography>
                                                                <Typography
                                                                    variant="caption"
                                                                    sx={{
                                                                        mt: 0.75,
                                                                        display: "-webkit-box",
                                                                        overflow: "hidden",
                                                                        color: "#64748b",
                                                                        lineHeight: 1.45,
                                                                        WebkitLineClamp: 2,
                                                                        WebkitBoxOrient: "vertical",
                                                                    }}
                                                                >
                                                                    {methodLearningDescriptionI18N[method] || "—"}
                                                                </Typography>
                                                            </Box>
                                                        </Tooltip>
                                                    );
                                                })}
                                            </Box>
                                        ) : (
                                            <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                                                Chưa có phương pháp học
                                            </Typography>
                                        )}
                                    </CardContent>
                                </Card>

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
                    <Button
                        onClick={() => {
                            if (publishLoading) return;
                            setViewModalOpen(false);
                            setConfirmPublishOpen(false);
                        }}
                        sx={{ textTransform: "none", fontWeight: 700, color: "#475569" }}
                    >
                        Đóng
                    </Button>
                    {isPrimaryBranch && normalizeStatus(viewCurriculum?.curriculumStatus) === "CUR_DRAFT" && (
                        <Button
                            onClick={() => setConfirmPublishOpen(true)}
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
                            Công bố
                        </Button>
                    )}
                    
                </DialogActions>
            </Dialog>

            {/* Confirm Publish Dialog */}
            <Dialog
                open={confirmPublishOpen}
                onClose={(event, reason) => {
                    if (reason === "backdropClick") return;
                    if (publishLoading) return;
                    setConfirmPublishOpen(false);
                }}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3, position: "relative" } }}
            >
                <IconButton
                    aria-label="Đóng"
                    onClick={() => {
                        if (publishLoading) return;
                        setConfirmPublishOpen(false);
                    }}
                    disabled={publishLoading}
                    sx={{ position: "absolute", right: 8, top: 8, zIndex: 1, color: "#64748b" }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
                <DialogTitle sx={{ fontWeight: 700, pr: 6 }}>Xác nhận công bố</DialogTitle>
                <DialogContent>
                    <Typography>
                        Bạn có chắc chắn muốn <ConfirmHighlight>công bố</ConfirmHighlight> chương trình này không?
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1, color: "#64748b" }}>
                        Sau khi công bố, bản nháp sẽ chuyển sang{" "}
                        <ConfirmHighlight>trạng thái hoạt động</ConfirmHighlight>.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button
                        onClick={() => setConfirmPublishOpen(false)}
                        disabled={publishLoading}
                        sx={{ textTransform: "none" }}
                    >
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handlePublishFromView}
                        disabled={publishLoading}
                        sx={{
                            textTransform: "none",
                            fontWeight: 800,
                            borderRadius: 2,
                            background: "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
                        }}
                    >
                        {publishLoading ? "Đang công bố..." : "Xác nhận công bố"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Create Curriculum Dialog */}
            <Dialog
                open={createModalOpen}
                onClose={(event, reason) => {
                    if (reason === "backdropClick") return;
                    handleCloseCreate();
                }}
                fullWidth
                maxWidth="md"
                PaperProps={{ sx: modalPaperSx }}
                slotProps={{ backdrop: { sx: modalBackdropSx } }}
            >
                <DialogTitle
                    sx={{
                        fontWeight: 850,
                        color: "#1e293b",
                        px: 3,
                        pt: 2.6,
                        pb: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 2,
                    }}
                >
                    Tạo chương trình
                    <IconButton
                        aria-label="Đóng"
                        onClick={handleCloseCreate}
                        disabled={submitLoading}
                        size="small"
                        sx={{ mr: -0.5, color: "#64748b" }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers={false} sx={{ px: 3, pt: 2, pb: 1 }}>
                    <Stack spacing={2.4}>
                        {/* Basic Information */}
                        <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#1e293b" }}>
                            Thông tin cơ bản
                        </Typography>

                        {formErrors.form ? (
                            <Alert severity="error" sx={{ borderRadius: 2 }}>
                                {formErrors.form}
                            </Alert>
                        ) : null}

                        <TextField
                            label="Tên phân loại"
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
                        />

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

                        {renderMethodLearningCardSelector(false)}

                        <TextField
                            label="Năm áp dụng"
                            name="applicationYear"
                            type="number"
                            fullWidth
                            value={formValues.applicationYear}
                            onChange={handleBasicChange}
                            error={!!formErrors.applicationYear}
                            helperText={formErrors.applicationYear}
                            required
                            inputProps={{ min: minApplicationYear, max: maxApplicationYear, step: 1 }}
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
                                                        error={!!subjectErr?.description}
                                                        helperText={subjectErr?.description}
                                                    />
                                                </Stack>

                                                <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1.2, flexWrap: "wrap" }}>
                                                    <Chip
                                                        size="small"
                                                        label="Bắt buộc"
                                                        sx={{
                                                            fontWeight: 800,
                                                            bgcolor: "rgba(34, 197, 94, 0.14)",
                                                            color: "#15803d",
                                                            border: "1px solid rgba(34, 197, 94, 0.35)",
                                                        }}
                                                    />
                                                    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>
                                                        Môn trong khung chương trình luôn là môn bắt buộc.
                                                    </Typography>
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
                        onClick={handleCreateSubmit}
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
                onClose={(event, reason) => {
                    if (reason === "backdropClick") return;
                    handleCloseEdit();
                }}
                fullWidth
                maxWidth="md"
                PaperProps={{ sx: modalPaperSx }}
                slotProps={{ backdrop: { sx: modalBackdropSx } }}
            >
                <DialogTitle
                    sx={{
                        fontWeight: 850,
                        color: "#1e293b",
                        px: 3,
                        pt: 2.6,
                        pb: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 2,
                    }}
                >
                    Chỉnh sửa chương trình
                    <IconButton
                        aria-label="Đóng"
                        onClick={handleCloseEdit}
                        disabled={submitLoading}
                        size="small"
                        sx={{ mr: -0.5, color: "#64748b" }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers={false} sx={{ px: 3, pt: 2, pb: 1 }}>
                    {/* reuse same form as create */}
                    <Stack spacing={2.4}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#1e293b" }}>
                            Thông tin cơ bản
                        </Typography>

                        {formErrors.form ? (
                            <Alert severity="error" sx={{ borderRadius: 2 }}>
                                {formErrors.form}
                            </Alert>
                        ) : null}

                        <TextField
                            label="Tên phân loại"
                            name="subTypeName"
                            fullWidth
                            value={formValues.subTypeName}
                            onChange={handleBasicChange}
                            error={!!formErrors.subTypeName}
                            helperText={formErrors.subTypeName}
                            required
                            disabled={isEditFieldsLocked}
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
                        />

                        {isEditFieldsLocked && (
                            <Typography variant="body2" sx={{ color: "#c2410c", bgcolor: "rgba(234, 88, 12, 0.08)", p: 1.5, borderRadius: 2 }}>
                                Thông tin này không thể thay đổi vì đã được sử dụng bởi chương trình.
                            </Typography>
                        )}

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

                        {renderMethodLearningCardSelector(false)}

                        <TextField
                            label="Năm áp dụng"
                            name="applicationYear"
                            type="number"
                            fullWidth
                            value={formValues.applicationYear}
                            onChange={handleBasicChange}
                            error={!!formErrors.applicationYear}
                            helperText={formErrors.applicationYear}
                            required
                            disabled={isEditFieldsLocked}
                            inputProps={{ min: minApplicationYear, max: maxApplicationYear, step: 1 }}
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
                                                        error={!!subjectErr?.description}
                                                        helperText={subjectErr?.description}
                                                    />
                                                </Stack>

                                                <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1.2, flexWrap: "wrap" }}>
                                                    <Chip
                                                        size="small"
                                                        label="Bắt buộc"
                                                        sx={{
                                                            fontWeight: 800,
                                                            bgcolor: "rgba(34, 197, 94, 0.14)",
                                                            color: "#15803d",
                                                            border: "1px solid rgba(34, 197, 94, 0.35)",
                                                        }}
                                                    />
                                                    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>
                                                        Môn trong curriculum luôn là môn bắt buộc.
                                                    </Typography>
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
                        onClick={handleEditSubmit}
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

