import React, { useState, useEffect, useMemo } from "react";
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
    InputLabel,
    Menu,
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
    Typography,
    Pagination,
} from "@mui/material";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import BusinessIcon from "@mui/icons-material/Business";
import CampaignIcon from "@mui/icons-material/Campaign";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import SchoolIcon from "@mui/icons-material/School";
import { enqueueSnackbar } from "notistack";
import { ConfirmHighlight } from "../../ui/ConfirmDialog.jsx";
import { extractCampusListBody, listCampuses } from "../../../services/CampusService.jsx";
import { getProgramList } from "../../../services/ProgramService.jsx";
import { useSchool } from "../../../contexts/SchoolContext.jsx";
import {
    getCampaignOfferingsByCampus,
    createCampaignOffering,
    updateCampaignOffering,
    updateCampusOfferingStatus,
} from "../../../services/CampaignService.jsx";

const LEARNING_MODES = [
    { value: "DAY_SCHOOL", label: "Học ban ngày" },
    { value: "BOARDING", label: "Nội trú" },
    { value: "SEMI_BOARDING", label: "Bán trú" },
    { value: "HALF_DAY", label: "Nửa ngày" },
];

const APPLICATION_STATUS_OPTIONS = [
    { value: "OPEN", label: "Đang mở" },
    { value: "CLOSED", label: "Đã đóng" },
    { value: "PAUSE", label: "Tạm dừng" },
    { value: "FULL", label: "Đầy chỗ" },
    { value: "CANCELLED", label: "Đã hủy" },
];

const APPLICATION_STATUS_BADGES = {
    OPEN: { badgeBg: "rgba(34, 197, 94, 0.16)", badgeColor: "#16a34a" }, // green
    PAUSE: { badgeBg: "rgba(250, 204, 21, 0.22)", badgeColor: "#a16207" }, // amber
    FULL: { badgeBg: "rgba(239, 68, 68, 0.14)", badgeColor: "#dc2626" }, // red
    CLOSED: { badgeBg: "rgba(148, 163, 184, 0.22)", badgeColor: "#475569" }, // slate
    CANCELLED: { badgeBg: "rgba(248, 113, 113, 0.14)", badgeColor: "#b91c1c" }, // muted red
};

/** Trạng thái vòng đời chỉ tiêu (field `status` từ API) */
const OFFERING_STATUS_LABELS = {
    OPEN: "Đang mở",
    OPEN_ADMISSION_CAMPAIGN: "Đang mở",
    PAUSED: "Tạm dừng",
    PAUSED_ADMISSION_CAMPAIGN: "Tạm dừng",
    CLOSED: "Đã đóng",
    CLOSED_ADMISSION_CAMPAIGN: "Đã đóng",
    CANCELLED: "Đã hủy",
    CANCELLED_ADMISSION_CAMPAIGN: "Đã hủy",
    FULL: "Đầy chỗ",
    EXPIRED: "Hết hạn",
};

function getOfferingStatusLabel(status) {
    const s = String(status || "").toUpperCase();
    return OFFERING_STATUS_LABELS[s] ?? (s || "—");
}

function normalizeCampaignLifecycleStatus(raw) {
    const s = String(raw || "").toUpperCase();
    if (s === "OPEN_ADMISSION_CAMPAIGN") return "OPEN";
    if (s === "PAUSED_ADMISSION_CAMPAIGN") return "PAUSED";
    if (s === "CLOSED_ADMISSION_CAMPAIGN") return "CLOSED";
    if (s === "CANCELLED_ADMISSION_CAMPAIGN") return "CANCELLED";
    return s;
}

function normalizeApplicationStatus(raw) {
    const s = String(raw || "").toUpperCase();
    if (s === "PAUSED") return "PAUSE";
    return s;
}

function normalizeOfferingRow(row) {
    if (!row || typeof row !== "object") return row;
    const programObj = row.program && typeof row.program === "object" ? row.program : null;
    const curriculumObj = row.curriculum && typeof row.curriculum === "object"
        ? row.curriculum
        : programObj?.curriculum && typeof programObj.curriculum === "object"
            ? programObj.curriculum
            : null;
    return {
        ...row,
        status: normalizeCampaignLifecycleStatus(row.status),
        applicationStatus: normalizeApplicationStatus(row.applicationStatus),
        applicationYear:
            row.applicationYear ??
            programObj?.applicationYear ??
            curriculumObj?.applicationYear ??
            null,
        programId: row.programId ?? programObj?.id,
        programName:
            row.programName ??
            programObj?.name ??
            (row.programId != null ? `Chương trình #${row.programId}` : "—"),
        baseTuitionFee: row.baseTuitionFee ?? programObj?.baseTuitionFee,
        curriculumType: row.curriculumType ?? curriculumObj?.curriculumType,
        curriculumId: row.curriculumId ?? curriculumObj?.id,
        curriculum: curriculumObj ?? row.curriculum,
        curriculumName: row.curriculum?.name ?? curriculumObj?.name ?? null,
        curriculumDescription: row.curriculum?.description ?? curriculumObj?.description ?? null,
        curriculumApplicationYear: row.curriculum?.applicationYear ?? curriculumObj?.applicationYear ?? null,
        curriculumGroupCode: row.curriculum?.groupCode ?? curriculumObj?.groupCode ?? null,
        curriculumStatus: row.curriculum?.status ?? curriculumObj?.status ?? null,
        curriculumSubjectOptions: row.curriculum?.subjectOptions ?? curriculumObj?.subjectOptions ?? [],
        curriculumMethodLearnings: row.curriculum?.methodLearnings ?? curriculumObj?.methodLearnings ?? [],
        programDetailId: programObj?.id ?? row.programId ?? null,
        programDetailName: programObj?.name ?? row.programName ?? null,
        programGraduationStandard: programObj?.graduationStandard ?? null,
        programLanguageOfInstructionList: programObj?.languageOfInstructionList ?? [],
        programTargetStudentDescription: programObj?.targetStudentDescription ?? null,
        programBaseTuitionFee: programObj?.baseTuitionFee ?? row.baseTuitionFee ?? null,
        programFeeUnit: programObj?.feeUnit ?? null,
        programExtraSubjectList: programObj?.extraSubjectList ?? [],
        programStatus: programObj?.status ?? null,
    };
}

function formatDate(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("vi-VN");
}

function formatCurrency(n) {
    if (n == null || n === "") return "—";
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
    }).format(Number(n));
}

function formatEnumLabel(v) {
    const s = String(v || "").trim();
    if (!s) return "—";
    return s.replaceAll("_", " ");
}

const BOARDING_TYPE_LABELS = {
    FULL_BOARDING: "Nội trú",
    SEMI_BOARDING: "Bán trú",
    BOTH: "Cả hai (Nội trú & Bán trú)",
};

function formatBoardingTypeLabel(v) {
    const s = String(v || "").trim().toUpperCase();
    if (!s) return "—";
    return BOARDING_TYPE_LABELS[s] ?? formatEnumLabel(s);
}

function stripHtmlTags(html) {
    const text = String(html || "").replace(/<[^>]*>/g, " ");
    return text.replace(/\s+/g, " ").trim();
}

/** Nhóm nội dung trong dialog chi tiết (theo domain). */
const DETAIL_SECTIONS = [
    {
        id: "campaign",
        title: "Chiến dịch tuyển sinh",
        Icon: CampaignIcon,
        fields: [
            { key: "campaignYear", label: "Năm chiến dịch" },
            { key: "campaignName", label: "Tên chiến dịch" },
            { key: "status", label: "Trạng thái chiến dịch" },
        ],
    },
    {
        id: "offering",
        title: "Chỉ tiêu tuyển sinh",
        Icon: AssignmentTurnedInIcon,
        fields: [
            { key: "learningMode", label: "Hình thức học" },
            { key: "boardingType", label: "Loại nội trú" },
            { key: "admissionMethod", label: "Phương thức tuyển sinh" },
            { key: "priceAdjustmentPercentage", label: "Điều chỉnh học phí (%)" },
            { key: "quota", label: "Chỉ tiêu" },
            { key: "remainingQuota", label: "Chỉ tiêu còn lại" },
            { key: "applicationStatus", label: "Trạng thái hồ sơ" },
            { key: "openDate", label: "Ngày mở nhận hồ sơ" },
            { key: "closeDate", label: "Ngày đóng nhận hồ sơ" },
            { key: "tuitionFee", label: "Học phí áp dụng" },
        ],
    },
    {
        id: "campus",
        title: "Cơ sở",
        Icon: BusinessIcon,
        fields: [
            { key: "campusName", label: "Tên cơ sở" },
            { key: "city", label: "Thành phố" },
            { key: "latitude", label: "Vĩ độ" },
            { key: "longitude", label: "Kinh độ" },
            { key: "district", label: "Quận / huyện" },
        ],
    },
    {
        id: "curriculum",
        title: "Khung Chương trình",
        Icon: SchoolIcon,
        fields: [
            { key: "curriculumName", label: "Tên chương trình" },
            { key: "curriculumDescription", label: "Mô tả" },
            { key: "curriculumType", label: "Loại chương trình" },
            { key: "curriculumApplicationYear", label: "Năm tuyển sinh" },
            { key: "curriculumGroupCode", label: "Mã nhóm" },
            { key: "curriculumStatus", label: "Trạng thái" },
            { key: "curriculumSubjectOptions", label: "Môn học" },
            { key: "curriculumMethodLearnings", label: "Phương pháp học" },
        ],
    },
    {
        id: "program",
        title: "Chương trình đào tạo",
        Icon: MenuBookIcon,
        fields: [
            { key: "programDetailName", label: "Tên chương trình đào tạo" },
            { key: "programGraduationStandard", label: "Chuẩn đầu ra" },
            { key: "programLanguageOfInstructionList", label: "Ngôn ngữ giảng dạy" },
            { key: "programTargetStudentDescription", label: "Đối tượng học sinh" },
            { key: "programBaseTuitionFee", label: "Học phí gốc" },
            { key: "programFeeUnit", label: "Đơn vị học phí" },
            { key: "programExtraSubjectList", label: "Môn học bổ sung" },
            { key: "programStatus", label: "Trạng thái" },
        ],
    },
];

const emptyForm = {
    campusId: "",
    programId: "",
    learningMode: "DAY_SCHOOL",
    quota: "",
    tuitionFee: "",
    priceAdjustmentPercentage: "0",
    openDate: "",
    closeDate: "",
};

/**
 * @param {{
 *   campaignId: number,
 *   campaignPaused: boolean,
 *   canMutate: boolean,
 *   campaignOptions?: Array<{ id: number|string, name: string, year?: number|string, status?: string }>,
 *   selectedCampaignId?: number|string,
 *   onCampaignChange?: (id: string) => void,
 *   campaignOptionsLoading?: boolean,
 *   openCreateSignal?: number,
 * }} props
 */
export default function CampaignOfferingsSection({
    campaignId,
    campaignPaused,
    canMutate,
    campaignOptions = [],
    selectedCampaignId = "",
    onCampaignChange,
    campaignOptionsLoading = false,
    openCreateSignal = 0,
}) {
    const { loading: schoolCtxLoading } = useSchool();

    const [campuses, setCampuses] = useState([]);
    const [programs, setPrograms] = useState([]);
    const [campusesLoading, setCampusesLoading] = useState(true);
    const [programsLoading, setProgramsLoading] = useState(true);
    const [campusFilter, setCampusFilter] = useState("");
    const [programFilter, setProgramFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [page, setPage] = useState(0);
    const pageSize = 8;
    const [rawItems, setRawItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [listNonce, setListNonce] = useState(0);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingRow, setEditingRow] = useState(null);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [formValues, setFormValues] = useState(emptyForm);
    const [formErrors, setFormErrors] = useState({});
    const [detailRow, setDetailRow] = useState(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [confirmActionOpen, setConfirmActionOpen] = useState(false);
    const [confirmActionType, setConfirmActionType] = useState(null); // "toggle" | "close"
    const [confirmTargetStatus, setConfirmTargetStatus] = useState(null); // targetStatus for toggle
    const [confirmRow, setConfirmRow] = useState(null);
    const [confirmActionLoading, setConfirmActionLoading] = useState(false);
    const [actionMenuAnchorEl, setActionMenuAnchorEl] = useState(null);
    const [actionMenuRow, setActionMenuRow] = useState(null);

    useEffect(() => {
        let cancelled = false;
        setCampusesLoading(true);
        listCampuses()
            .then((res) => {
                if (cancelled) return;
                const list = extractCampusListBody(res);
                const arr = Array.isArray(list)
                    ? list.map((c) => ({ id: c.id ?? c.campusId, name: c.name ?? "Cơ sở" }))
                    : [];
                setCampuses(arr);
                if (arr.length > 0 && !campusFilter) setCampusFilter(String(arr[0].id));
            })
            .catch(() => {
                if (!cancelled) enqueueSnackbar("Không tải được danh sách cơ sở", { variant: "error" });
            })
            .finally(() => {
                if (!cancelled) setCampusesLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        setProgramsLoading(true);
        getProgramList(0, 200)
            .then((res) => {
                if (cancelled) return;
                const body = res?.data?.body ?? res?.body ?? res?.data;
                const list = body?.items ?? body;
                const arr = Array.isArray(list)
                    ? list.map((p) => ({
                          id: p.id ?? p.programId,
                          name:
                              p.programName ??
                              (p.name != null && String(p.name).trim() !== "" ? p.name : null) ??
                              p.curriculumName ??
                              `Chương trình #${p.id}`,
                      }))
                    : [];
                setPrograms(arr.filter((p) => p.id != null));
            })
            .catch(() => {
                if (!cancelled) enqueueSnackbar("Không tải được chương trình", { variant: "error" });
            })
            .finally(() => {
                if (!cancelled) setProgramsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (schoolCtxLoading) return;
        if (!campusFilter || !campaignId) {
            setRawItems([]);
            setLoading(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        const aggregatePages = async () => {
            const acc = [];
            let p = 0;
            const batchSize = 50;
            try {
                while (!cancelled) {
                    const res = await getCampaignOfferingsByCampus(parseInt(campusFilter, 10), {
                        page: p,
                        pageSize: batchSize,
                    });
                    const body = res?.data?.body ?? res?.data;
                    const chunk = Array.isArray(body) ? body : body?.items ?? [];
                    const forCampaign = chunk
                        .filter((row) => Number(row?.campaignId) === Number(campaignId))
                        .map(normalizeOfferingRow);
                    acc.push(...forCampaign);
                    if (chunk.length === 0) break;
                    if (chunk.length < batchSize) break;
                    if (body?.hasNext === false) break;
                    p += 1;
                    if (p > 40) break;
                }
                if (!cancelled) setRawItems(acc);
            } catch (err) {
                if (!cancelled) {
                    console.error("Fetch offerings error:", err);
                    enqueueSnackbar(
                        err?.response?.data?.message || "Không tải được danh sách chỉ tiêu",
                        { variant: "error" }
                    );
                    setRawItems([]);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        aggregatePages();
        return () => {
            cancelled = true;
        };
    }, [campusFilter, campaignId, listNonce, schoolCtxLoading]);

    const filteredItems = useMemo(() => {
        let list = rawItems;
        if (programFilter !== "all") {
            const pid = parseInt(programFilter, 10);
            list = list.filter((r) => Number(r.programId) === pid);
        }
        if (statusFilter !== "all") {
            list = list.filter(
                (r) =>
                    normalizeApplicationStatus(r.applicationStatus) === statusFilter ||
                    String(r.status || "").toUpperCase() === statusFilter
            );
        }
        return list;
    }, [rawItems, programFilter, statusFilter]);

    const items = useMemo(() => {
        const start = page * pageSize;
        return filteredItems.slice(start, start + pageSize);
    }, [filteredItems, page, pageSize]);

    const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));

    useEffect(() => {
        setPage(0);
    }, [campusFilter, programFilter, statusFilter]);

    useEffect(() => {
        if (!openCreateSignal || !canMutate) return;
        openCreate();
    }, [openCreateSignal, canMutate]);

    const getLearningModeLabel = (mode) =>
        LEARNING_MODES.find((m) => m.value === mode)?.label ?? mode ?? "—";
    const getApplicationStatusLabel = (s) =>
        APPLICATION_STATUS_OPTIONS.find((o) => o.value === normalizeApplicationStatus(s))?.label ??
        normalizeApplicationStatus(s) ??
        "—";

    const getApplicationStatusBadgeStyle = (s) => {
        const key = normalizeApplicationStatus(s);
        return APPLICATION_STATUS_BADGES[key] ?? { badgeBg: "#f1f5f9", badgeColor: "#64748b" };
    };

    const getProgramName = (id) =>
        programs.find((p) => Number(p.id) === Number(id))?.name ?? id ?? "—";
    const getLifecycleStatus = (row) => normalizeCampaignLifecycleStatus(row?.status ?? "");
    const getApplicationStatus = (row) => normalizeApplicationStatus(row?.applicationStatus ?? "");
    const canPauseOrClose = (row) => getApplicationStatus(row) === "OPEN";
    const canPublishOrClose = (row) => getApplicationStatus(row) === "PAUSE";

    const formatDetailValue = (key, value) => {
        if (value === null || value === undefined || value === "") return "—";
        if (key === "tuitionFee" || key === "baseTuitionFee" || key === "programBaseTuitionFee") return formatCurrency(value);
        if (key === "openDate" || key === "closeDate") return formatDate(value);
        if (key === "learningMode") return getLearningModeLabel(value);
        if (key === "boardingType") return formatBoardingTypeLabel(value);
        if (
            key === "admissionMethod" ||
            key === "curriculumType" ||
            key === "curriculumStatus" ||
            key === "programFeeUnit" ||
            key === "programStatus"
        ) return formatEnumLabel(value);
        if (key === "applicationStatus")
            return getApplicationStatusLabel(String(value || "").toUpperCase());
        if (key === "curriculumSubjectOptions") {
            if (!Array.isArray(value) || value.length === 0) return "—";
            return value
                .map((s) => {
                    if (!s || typeof s !== "object") return null;
                    const nm = String(s.name || "").trim();
                    if (!nm) return null;
                    return s.isMandatory ? `${nm} (bắt buộc)` : nm;
                })
                .filter(Boolean)
                .join(", ") || "—";
        }
        if (
            key === "curriculumMethodLearnings" ||
            key === "programLanguageOfInstructionList" ||
            key === "programExtraSubjectList"
        ) {
            if (!Array.isArray(value) || value.length === 0) return "—";
            return value.map((x) => formatEnumLabel(x)).join(", ");
        }
        if (key === "programGraduationStandard" || key === "programTargetStudentDescription") {
            return stripHtmlTags(value) || "—";
        }
        if (key === "status") return getOfferingStatusLabel(String(value || "").toUpperCase());
        if (key === "priceAdjustmentPercentage") {
            const n = Number(value);
            if (!Number.isFinite(n)) return String(value);
            const pct = Math.abs(n) <= 1 ? n * 100 : n;
            return `${pct}%`;
        }
        if (key === "latitude" || key === "longitude") {
            const n = Number(value);
            return Number.isFinite(n) ? n.toFixed(6) : String(value);
        }
        if (typeof value === "object") return JSON.stringify(value);
        return String(value);
    };

    const validateForm = () => {
        const errors = {};
        if (!formValues.campusId) errors.campusId = "Vui lòng chọn cơ sở";
        if (!formValues.programId) errors.programId = "Vui lòng chọn chương trình";
        if (editingRow && (formValues.quota === "" || Number(formValues.quota) < 0)) {
            errors.quota = "Chỉ tiêu không hợp lệ";
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const openCreate = () => {
        setEditingRow(null);
        setFormValues({
            ...emptyForm,
            campusId: campusFilter || (campuses[0]?.id != null ? String(campuses[0].id) : ""),
        });
        setFormErrors({});
        setModalOpen(true);
    };

    const openEdit = (row) => {
        setEditingRow(row);
        setFormValues({
            campusId: String(row.campusId ?? ""),
            programId: String(row.programId ?? ""),
            learningMode: row.learningMode || "DAY_SCHOOL",
            quota: row.quota != null ? String(row.quota) : "",
            tuitionFee: row.tuitionFee != null ? String(row.tuitionFee) : "",
            priceAdjustmentPercentage:
                row.priceAdjustmentPercentage != null ? String(row.priceAdjustmentPercentage) : "0",
            openDate: row.openDate?.slice(0, 10) || "",
            closeDate: row.closeDate?.slice(0, 10) || "",
        });
        setFormErrors({});
        setModalOpen(true);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormValues((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        const isEditingReadOnly = !!editingRow && String(editingRow.applicationStatus || "").toUpperCase() === "CLOSED";
        if (isEditingReadOnly) return;
        if (!validateForm() || !campaignId) return;
        setSubmitLoading(true);
        try {
            if (editingRow) {
                const res = await updateCampaignOffering({
                    id: editingRow.id,
                    admissionCampaignId: campaignId,
                    campusId: Number(formValues.campusId),
                    programId: Number(formValues.programId),
                    quota: Number(formValues.quota) || 0,
                    learningMode: formValues.learningMode || "DAY_SCHOOL",
                    tuitionFee: Number(formValues.tuitionFee) || 0,
                    openDate: formValues.openDate || "",
                    closeDate: formValues.closeDate || "",
                });
                if (res?.status === 200 || res?.data?.message) {
                    enqueueSnackbar(res?.data?.message || "Cập nhật chỉ tiêu thành công", {
                        variant: "success",
                    });
                    setModalOpen(false);
                    setListNonce((n) => n + 1);
                } else {
                    enqueueSnackbar(res?.data?.message || "Cập nhật chỉ tiêu thất bại", { variant: "error" });
                }
            } else {
                const res = await createCampaignOffering({
                    admissionCampaignId: campaignId,
                    campusId: Number(formValues.campusId),
                    programId: Number(formValues.programId),
                    learningMode: formValues.learningMode || "DAY_SCHOOL",
                    priceAdjustmentPercentage: Number(formValues.priceAdjustmentPercentage) || 0,
                });
                if (res?.status === 200 || res?.data?.message != null) {
                    enqueueSnackbar(res?.data?.message || "Tạo chỉ tiêu thành công", { variant: "success" });
                    setModalOpen(false);
                    setPage(0);
                    setListNonce((n) => n + 1);
                } else {
                    enqueueSnackbar(res?.data?.message || "Tạo chỉ tiêu thất bại", { variant: "error" });
                }
            }
        } catch (err) {
            enqueueSnackbar(err?.response?.data?.message || "Thao tác thất bại", { variant: "error" });
        } finally {
            setSubmitLoading(false);
        }
    };

    const rowMuted = campaignPaused;

    const programOptions = useMemo(() => programs, [programs]);
    const isEditingReadOnly =
        !!editingRow && String(editingRow.applicationStatus || "").toUpperCase() === "CLOSED";

    const openConfirmToggle = (row, targetStatus) => {
        setConfirmRow(row);
        setConfirmTargetStatus(targetStatus);
        setConfirmActionType("toggle");
        setConfirmActionOpen(true);
    };

    const openConfirmClose = (row) => {
        setConfirmRow(row);
        setConfirmTargetStatus(null);
        setConfirmActionType("close");
        setConfirmActionOpen(true);
    };

    const openActionMenu = (e, row) => {
        e.stopPropagation();
        setActionMenuRow(row);
        setActionMenuAnchorEl(e.currentTarget);
    };

    const closeActionMenu = () => {
        setActionMenuAnchorEl(null);
        setActionMenuRow(null);
    };

    const handleConfirmAction = async () => {
        if (!confirmRow || !confirmActionType) return;
        setConfirmActionLoading(true);
        try {
            if (confirmActionType === "toggle") {
                const action = confirmTargetStatus === "PAUSE" ? "PAUSE" : "PUBLISH";
                await updateCampusOfferingStatus(confirmRow.id, action);
                enqueueSnackbar(
                    confirmTargetStatus === "PAUSE" ? "Đã tạm dừng chỉ tiêu." : "Đã công bố chỉ tiêu.",
                    { variant: "success" }
                );
            } else if (confirmActionType === "close") {
                await updateCampusOfferingStatus(confirmRow.id, "CLOSE");
                enqueueSnackbar("Đã đóng chương trình.", { variant: "success" });
            }
            setConfirmActionOpen(false);
            setConfirmActionType(null);
            setConfirmTargetStatus(null);
            setConfirmRow(null);
            setListNonce((n) => n + 1);
        } catch (err) {
            enqueueSnackbar(err?.response?.data?.message || "Thao tác thất bại", { variant: "error" });
        } finally {
            setConfirmActionLoading(false);
        }
    };

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Card
                elevation={0}
                sx={{
                    borderRadius: "16px",
                    border: "1px solid #e2e8f0",
                    overflow: "hidden",
                    bgcolor: "#fff",
                    boxShadow: "0 4px 24px rgba(51,65,85,0.06)",
                }}
            >
                <Box
                    sx={{
                        px: 2.5,
                        pt: 2.5,
                        pb: 1.5,
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 1.5,
                    }}
                >
                    <AssignmentTurnedInIcon sx={{ color: "#0D64DE", fontSize: 28, mt: 0.25 }} />
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: "#1e293b", lineHeight: 1.3 }}>
                            Danh sách chỉ tiêu
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#64748b", mt: 0.5 }}>
                            Quản lý chỉ tiêu tuyển sinh theo chiến dịch và cơ sở.
                        </Typography>
                        {campaignPaused && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                                Chiến dịch đang tạm dừng, dữ liệu chỉ tiêu đang ở chế độ chỉ xem.
                            </Typography>
                        )}
                    </Box>
                </Box>
                <CardContent sx={{ p: 2.5, pt: 1.5, pb: 2 }}>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={2} flexWrap="wrap">
                        {typeof onCampaignChange === "function" ? (
                            <FormControl size="small" sx={{ minWidth: 260 }} disabled={campaignOptionsLoading}>
                                <InputLabel>Chiến dịch tuyển sinh</InputLabel>
                                <Select
                                    value={selectedCampaignId === "" ? "" : String(selectedCampaignId)}
                                    label="Chiến dịch tuyển sinh"
                                    onChange={(e) => onCampaignChange(String(e.target.value || ""))}
                                    sx={{ borderRadius: 2, bgcolor: "#f8fafc" }}
                                >
                                    {campaignOptions.map((c) => (
                                        <MenuItem key={String(c.id)} value={String(c.id)}>
                                            {c.name} {c.year != null ? `(${c.year})` : ""} {c.status ? `· ${c.status}` : ""}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        ) : null}
                        <FormControl size="small" sx={{ minWidth: 180 }} disabled={campusesLoading}>
                            <InputLabel>Cơ sở</InputLabel>
                            <Select
                                value={campusFilter}
                                label="Cơ sở"
                                onChange={(e) => setCampusFilter(e.target.value)}
                                sx={{ borderRadius: 2, bgcolor: "#f8fafc" }}
                            >
                                {campuses.map((c) => (
                                    <MenuItem key={c.id} value={String(c.id)}>
                                        {c.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 180 }} disabled={programsLoading}>
                            <InputLabel>Chương trình</InputLabel>
                            <Select
                                value={programFilter}
                                label="Chương trình"
                                onChange={(e) => setProgramFilter(e.target.value)}
                                sx={{ borderRadius: 2, bgcolor: "#f8fafc" }}
                            >
                                <MenuItem value="all">Tất cả</MenuItem>
                                {programOptions.map((p) => (
                                    <MenuItem key={p.id} value={String(p.id)}>
                                        {p.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 170 }}>
                            <InputLabel>Trạng thái hồ sơ</InputLabel>
                            <Select
                                value={statusFilter}
                                label="Trạng thái hồ sơ"
                                onChange={(e) => setStatusFilter(e.target.value)}
                                sx={{ borderRadius: 2, bgcolor: "#f8fafc" }}
                            >
                                <MenuItem value="all">Tất cả</MenuItem>
                                {APPLICATION_STATUS_OPTIONS.map((o) => (
                                    <MenuItem key={o.value} value={o.value}>
                                        {o.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>
                </CardContent>
                <TableContainer sx={{ borderTop: "1px solid #e2e8f0" }}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: "#f8fafc" }}>
                                <TableCell sx={{ fontWeight: 700, color: "#1e293b", py: 2 }}>Cơ sở</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#1e293b", py: 2 }}>Chương trình</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#1e293b", py: 2 }}>Hình thức</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#1e293b", py: 2 }}>Chỉ tiêu / Còn lại</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#1e293b", py: 2 }}>Học phí</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#1e293b", py: 2 }}>Trạng thái hồ sơ</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#1e293b", py: 2 }}>Mở — Đóng</TableCell>
                                {canMutate && (
                                    <TableCell align="right" sx={{ fontWeight: 700, color: "#1e293b", py: 2 }}>
                                        Thao tác
                                    </TableCell>
                                )}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <TableRow key={i}>
                                        {Array.from({ length: canMutate ? 8 : 7 }).map((__, j) => (
                                            <TableCell key={j} sx={{ py: 2 }}>
                                                <Skeleton variant="text" width="80%" />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : items.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={canMutate ? 8 : 7} align="center" sx={{ py: 6 }}>
                                        <Typography color="text.secondary">Chưa có chỉ tiêu cho bộ lọc này.</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                items.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        hover
                                        onClick={() => {
                                            setDetailRow(row);
                                            setDetailOpen(true);
                                        }}
                                        sx={{
                                            cursor: "pointer",
                                            opacity: rowMuted ? 0.72 : 1,
                                            bgcolor: rowMuted ? "rgba(250, 204, 21, 0.06)" : "inherit",
                                        }}
                                    >
                                        <TableCell sx={{ py: 2.25 }}>{row.campusName ?? "—"}</TableCell>
                                        <TableCell sx={{ py: 2.25 }}>{row.programName ?? getProgramName(row.programId)}</TableCell>
                                        <TableCell sx={{ py: 2.25 }}>{getLearningModeLabel(row.learningMode)}</TableCell>
                                        <TableCell sx={{ py: 2.25 }}>
                                            {row.quota ?? "—"} / {row.remainingQuota ?? "—"}
                                        </TableCell>
                                        <TableCell sx={{ py: 2.25 }}>{formatCurrency(row.tuitionFee)}</TableCell>
                                        <TableCell sx={{ py: 2.25 }}>
                                            {(() => {
                                                const label = getApplicationStatusLabel(row.applicationStatus);
                                                const { badgeBg, badgeColor } = getApplicationStatusBadgeStyle(
                                                    row.applicationStatus
                                                );
                                                return (
                                                    <Box
                                                        component="span"
                                                        sx={{
                                                            display: "inline-flex",
                                                            alignItems: "center",
                                                            px: 1.2,
                                                            py: 0.4,
                                                            borderRadius: "999px",
                                                            fontSize: 12,
                                                            fontWeight: 800,
                                                            lineHeight: 1,
                                                            color: badgeColor,
                                                            bgcolor: badgeBg,
                                                        }}
                                                    >
                                                        {label}
                                                    </Box>
                                                );
                                            })()}
                                        </TableCell>
                                        <TableCell sx={{ py: 2.25 }}>
                                            {formatDate(row.openDate)} — {formatDate(row.closeDate)}
                                        </TableCell>
                                        {canMutate && (
                                            <TableCell align="right" sx={{ py: 2.25 }}>
                                                <Stack direction="row" spacing={1.2} justifyContent="flex-end">
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openEdit(row);
                                                        }}
                                                        aria-label="Sửa chỉ tiêu"
                                                        sx={{ color: "#0D64DE" }}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>

                                                    {(canPauseOrClose(row) || canPublishOrClose(row)) && (
                                                        <IconButton
                                                            size="small"
                                                            aria-label="Thao tác khác"
                                                            onClick={(e) => openActionMenu(e, row)}
                                                            disabled={confirmActionLoading}
                                                            sx={{ color: "#64748b" }}
                                                        >
                                                            <MoreVertIcon fontSize="small" />
                                                        </IconButton>
                                                    )}
                                                </Stack>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                {filteredItems.length > pageSize && (
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "flex-end",
                            px: 3,
                            py: 1.5,
                            borderTop: "1px solid #e2e8f0",
                            bgcolor: "#f8fafc",
                        }}
                    >
                        <Pagination
                            count={totalPages}
                            page={page + 1}
                            onChange={(_, p) => setPage(p - 1)}
                            color="primary"
                            shape="rounded"
                        />
                    </Box>
                )}
            </Card>

            <Dialog
                open={detailOpen}
                onClose={(event, reason) => {
                    if (reason === "backdropClick") return;
                    setDetailOpen(false);
                    setDetailRow(null);
                }}
                fullWidth
                maxWidth="lg"
                scroll="paper"
                PaperProps={{
                    sx: { borderRadius: "16px", boxShadow: "0 24px 48px rgba(0,0,0,0.12)" },
                }}
                slotProps={{ backdrop: { sx: { backdropFilter: "blur(6px)" } } }}
            >
                <DialogTitle sx={{ fontWeight: 700, pr: 6 }}>Chi tiết chỉ tiêu</DialogTitle>
                <IconButton
                    aria-label="Đóng"
                    onClick={() => {
                        setDetailOpen(false);
                        setDetailRow(null);
                    }}
                    sx={{ position: "absolute", right: 8, top: 8 }}
                >
                    <CloseIcon />
                </IconButton>
                <DialogContent dividers sx={{ pt: 2, pb: 2 }}>
                    <Stack spacing={2.5}>
                        {DETAIL_SECTIONS.map((section) => {
                            const { id, title, fields } = section;
                            const SectionIcon = section.Icon;
                            return (
                            <Card
                                key={id}
                                elevation={0}
                                sx={{
                                    borderRadius: "14px",
                                    border: "1px solid #e2e8f0",
                                    overflow: "hidden",
                                    boxShadow: "0 1px 3px rgba(51,65,85,0.06)",
                                }}
                            >
                                <Box
                                    sx={{
                                        px: 2,
                                        py: 1.25,
                                        borderBottom: "1px solid #e2e8f0",
                                        bgcolor: "rgba(13, 100, 222, 0.06)",
                                    }}
                                >
                                    <Stack direction="row" alignItems="center" spacing={1.5}>
                                        <Box
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                width: 44,
                                                height: 44,
                                                borderRadius: "12px",
                                                bgcolor: "rgba(13, 100, 222, 0.14)",
                                                color: "#0D64DE",
                                                flexShrink: 0,
                                            }}
                                        >
                                            <SectionIcon sx={{ fontSize: 26 }} aria-hidden />
                                        </Box>
                                        <Typography
                                            variant="subtitle1"
                                            sx={{ fontWeight: 700, color: "#1e293b", minWidth: 0 }}
                                        >
                                            {title}
                                        </Typography>
                                    </Stack>
                                </Box>
                                <CardContent sx={{ pt: 2, "&:last-child": { pb: 2 } }}>
                                    <Box
                                        sx={{
                                            display: "grid",
                                            gridTemplateColumns: {
                                                xs: "1fr",
                                                sm: "repeat(2, minmax(0, 1fr))",
                                            },
                                            gap: 1.5,
                                        }}
                                    >
                                        {fields.map(({ key, label }) => (
                                            <Box
                                                key={key}
                                                sx={{
                                                    border: "1px solid #e8eef5",
                                                    borderRadius: "12px",
                                                    p: 1.5,
                                                    bgcolor: "#f8fafc",
                                                }}
                                            >
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                    sx={{ display: "block", mb: 0.5 }}
                                                >
                                                    {label}
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        fontWeight: 600,
                                                        color: "#1e293b",
                                                        wordBreak: "break-word",
                                                    }}
                                                >
                                                    {formatDetailValue(key, detailRow?.[key])}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                </CardContent>
                            </Card>
                            );
                        })}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button
                        onClick={() => {
                            setDetailOpen(false);
                            setDetailRow(null);
                        }}
                        sx={{ textTransform: "none" }}
                    >
                        Đóng cửa sổ
                    </Button>
                    {canMutate && detailRow && canPauseOrClose(detailRow) ? (
                        <Button
                            variant="outlined"
                            color="warning"
                            disabled={confirmActionLoading}
                            onClick={() => {
                                setConfirmRow(detailRow);
                                setConfirmTargetStatus("PAUSE");
                                setConfirmActionType("toggle");
                                setConfirmActionOpen(true);
                            }}
                            sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}
                        >
                            Tạm dừng
                        </Button>
                    ) : null}
                    {canMutate && detailRow && canPublishOrClose(detailRow) ? (
                        <Button
                            variant="outlined"
                            color="primary"
                            disabled={confirmActionLoading}
                            onClick={() => {
                                setConfirmRow(detailRow);
                                setConfirmTargetStatus("OPEN");
                                setConfirmActionType("toggle");
                                setConfirmActionOpen(true);
                            }}
                            sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}
                        >
                            Công bố
                        </Button>
                    ) : null}
                    {canMutate && detailRow && (canPauseOrClose(detailRow) || canPublishOrClose(detailRow)) ? (
                        <Button
                            variant="outlined"
                            color="error"
                            disabled={confirmActionLoading}
                            onClick={() => {
                                setConfirmRow(detailRow);
                                setConfirmTargetStatus(null);
                                setConfirmActionType("close");
                                setConfirmActionOpen(true);
                            }}
                            sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}
                        >
                            Đóng
                        </Button>
                    ) : null}
                    {canMutate && detailRow && (
                        <Button
                            variant="contained"
                            onClick={() => {
                                openEdit(detailRow);
                                setDetailOpen(false);
                                setDetailRow(null);
                            }}
                            sx={{ textTransform: "none", fontWeight: 600, bgcolor: "#0D64DE", borderRadius: 2 }}
                        >
                            Sửa chỉ tiêu
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            <Dialog
                open={modalOpen}
                onClose={(event, reason) => {
                    if (reason === "backdropClick") return;
                    setModalOpen(false);
                }}
                fullWidth
                maxWidth="sm"
                PaperProps={{
                    sx: { borderRadius: "16px", boxShadow: "0 24px 48px rgba(0,0,0,0.12)" },
                }}
                slotProps={{ backdrop: { sx: { backdropFilter: "blur(6px)" } } }}
            >
                <Box sx={{ px: 3, pt: 3, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {editingRow ? "Sửa chỉ tiêu" : "Thêm chỉ tiêu"}
                    </Typography>
                    <IconButton size="small" onClick={() => setModalOpen(false)} aria-label="Đóng">
                        <CloseIcon />
                    </IconButton>
                </Box>
                <DialogContent>
                    <Stack spacing={2}>
                        <FormControl fullWidth size="small" error={!!formErrors.campusId}>
                            <InputLabel>Cơ sở</InputLabel>
                            <Select
                                name="campusId"
                                value={formValues.campusId}
                                label="Cơ sở"
                                onChange={handleChange}
                                disabled={!!editingRow}
                                sx={{ borderRadius: 2 }}
                            >
                                {campuses.map((c) => (
                                    <MenuItem key={c.id} value={String(c.id)}>
                                        {c.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth size="small" error={!!formErrors.programId}>
                            <InputLabel>Chương trình đào tạo</InputLabel>
                            <Select
                                name="programId"
                                value={formValues.programId}
                                label="Chương trình đào tạo"
                                onChange={handleChange}
                                disabled={!!editingRow}
                                sx={{ borderRadius: 2 }}
                            >
                                {programs.map((p) => (
                                    <MenuItem key={p.id} value={String(p.id)}>
                                        {p.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth size="small">
                            <InputLabel>Hình thức học</InputLabel>
                            <Select
                                name="learningMode"
                                value={formValues.learningMode}
                                label="Hình thức học"
                                onChange={handleChange}
                                disabled={isEditingReadOnly}
                                sx={{ borderRadius: 2 }}
                            >
                                {LEARNING_MODES.map((m) => (
                                    <MenuItem key={m.value} value={m.value}>
                                        {m.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        {editingRow ? (
                            <TextField
                                label="Chỉ tiêu"
                                name="quota"
                                type="number"
                                fullWidth
                                size="small"
                                value={formValues.quota}
                                onChange={handleChange}
                                error={!!formErrors.quota}
                                helperText={formErrors.quota}
                                disabled={isEditingReadOnly}
                                inputProps={{ min: 0 }}
                            />
                        ) : null}
                        {editingRow ? (
                            <TextField
                                label="Học phí (VNĐ)"
                                name="tuitionFee"
                                type="number"
                                fullWidth
                                size="small"
                                value={formValues.tuitionFee}
                                onChange={handleChange}
                                disabled={isEditingReadOnly}
                                inputProps={{ min: 0 }}
                                helperText={
                                    editingRow.baseTuitionFee != null
                                        ? `Học phí gốc chương trình: ${formatCurrency(editingRow.baseTuitionFee)}`
                                        : undefined
                                }
                            />
                        ) : (
                            <TextField
                                label="Điều chỉnh học phí (%)"
                                name="priceAdjustmentPercentage"
                                type="number"
                                fullWidth
                                size="small"
                                value={formValues.priceAdjustmentPercentage}
                                onChange={handleChange}
                                inputProps={{ min: 0, max: 100 }}
                                helperText="Áp dụng trên học phí gốc của chương trình (API tạo chỉ tiêu)"
                            />
                        )}
                        {editingRow ? (
                            <TextField
                                label="Ngày mở"
                                name="openDate"
                                type="date"
                                fullWidth
                                size="small"
                                value={formValues.openDate}
                                onChange={handleChange}
                                InputLabelProps={{ shrink: true }}
                                disabled={isEditingReadOnly}
                            />
                        ) : null}
                        {editingRow ? (
                            <TextField
                                label="Ngày đóng"
                                name="closeDate"
                                type="date"
                                fullWidth
                                size="small"
                                value={formValues.closeDate}
                                onChange={handleChange}
                                InputLabelProps={{ shrink: true }}
                                disabled={isEditingReadOnly}
                            />
                        ) : null}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #e2e8f0" }}>
                    <Button onClick={() => setModalOpen(false)} sx={{ textTransform: "none" }}>
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={submitLoading || isEditingReadOnly}
                        sx={{ textTransform: "none", fontWeight: 600, bgcolor: "#0D64DE", borderRadius: 2 }}
                    >
                        {submitLoading ? "Đang lưu…" : editingRow ? "Lưu" : "Tạo"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Menu
                anchorEl={actionMenuAnchorEl}
                open={Boolean(actionMenuAnchorEl)}
                onClose={closeActionMenu}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                slotProps={{
                    paper: { sx: { borderRadius: 2, minWidth: 220 } },
                }}
            >
                {actionMenuRow && canPauseOrClose(actionMenuRow) && (
                        <MenuItem
                            onClick={() => {
                                closeActionMenu();
                                openConfirmToggle(actionMenuRow, "PAUSE");
                            }}
                            disabled={confirmActionLoading}
                        >
                            Tạm dừng
                        </MenuItem>
                    )}

                {actionMenuRow && canPublishOrClose(actionMenuRow) && (
                        <MenuItem
                            onClick={() => {
                                closeActionMenu();
                                openConfirmToggle(actionMenuRow, "OPEN");
                            }}
                            disabled={confirmActionLoading}
                        >
                            Xuất bản
                        </MenuItem>
                    )}

                {actionMenuRow && (canPauseOrClose(actionMenuRow) || canPublishOrClose(actionMenuRow)) && (
                        <MenuItem
                            onClick={() => {
                                closeActionMenu();
                                openConfirmClose(actionMenuRow);
                            }}
                            disabled={confirmActionLoading}
                        >
                            Đóng chương trình
                        </MenuItem>
                    )}
            </Menu>

            <Dialog
                open={confirmActionOpen}
                onClose={(event, reason) => {
                    if (reason === "backdropClick") return;
                    if (!confirmActionLoading) setConfirmActionOpen(false);
                }}
                fullWidth
                maxWidth="sm"
                PaperProps={{
                    sx: { borderRadius: "16px", boxShadow: "0 24px 48px rgba(0,0,0,0.12)" },
                }}
                slotProps={{ backdrop: { sx: { backdropFilter: "blur(6px)" } } }}
            >
                <DialogTitle sx={{ fontWeight: 800 }}>
                    {confirmActionType === "toggle" ? "Xác nhận thao tác" : "Xác nhận đóng chương trình"}
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <Typography variant="body2" color="text.secondary" component="div">
                        {confirmActionType === "toggle" &&
                            (confirmTargetStatus === "PAUSE" ? (
                                <>
                                    Bạn có chắc chắn muốn <ConfirmHighlight>tạm dừng nhận hồ sơ</ConfirmHighlight>? Khi tạm dừng, chương trình sẽ{" "}
                                    <ConfirmHighlight>không còn nhận hồ sơ mới</ConfirmHighlight>.
                                </>
                            ) : (
                                <>
                                    Bạn có chắc chắn muốn <ConfirmHighlight>xuất bản chỉ tiêu</ConfirmHighlight>?
                                </>
                            ))}
                        {confirmActionType === "close" && (
                            <>
                                Bạn có chắc chắn muốn <ConfirmHighlight>đóng chương trình này</ConfirmHighlight>? Sau khi đóng sẽ{" "}
                                <ConfirmHighlight>không nhận thêm hồ sơ</ConfirmHighlight>.
                            </>
                        )}
                    </Typography>
                    {confirmRow && (
                        <Box sx={{ mt: 2, border: "1px solid #e2e8f0", borderRadius: 2, p: 2, bgcolor: "#f8fafc" }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                                Thông tin
                            </Typography>
                            <Typography variant="body2" component="div" sx={{ fontWeight: 700 }}>
                                <ConfirmHighlight>
                                    {confirmRow.programName ?? getProgramName(confirmRow.programId)}
                                </ConfirmHighlight>
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {confirmRow.campusName ?? "—"} · Chỉ tiêu: {confirmRow.quota ?? "—"} · Còn lại:{" "}
                                {confirmRow.remainingQuota ?? "—"}
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button
                        onClick={() => {
                            if (!confirmActionLoading) setConfirmActionOpen(false);
                        }}
                        sx={{ textTransform: "none" }}
                        disabled={confirmActionLoading}
                    >
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleConfirmAction}
                        disabled={confirmActionLoading}
                        sx={{ textTransform: "none", fontWeight: 700, bgcolor: "#0D64DE", borderRadius: 2 }}
                    >
                        {confirmActionLoading ? "Đang xử lý…" : "Xác nhận"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
