import React, {useCallback, useEffect, useMemo, useState} from "react";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Checkbox,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    IconButton,
    InputLabel,
    LinearProgress,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Paper,
    Select,
    Skeleton,
    Stack,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import {enqueueSnackbar} from "notistack";
import {ConfirmHighlight} from "../../ui/ConfirmDialog.jsx";
import {
    buildUpsertCampusScheduleTemplatePayload,
    fetchSchoolCampusScheduleTemplateListAll,
    getCampusScheduleTemplateList,
    getSchoolCampusScheduleTemplateList,
    normalizeScheduleTemplateDayMap,
    parseCampusSchedulePolicyFromConfigResponse,
    parseCampusScheduleTemplateListBody,
    parseSchoolCampusScheduleTemplateListBody,
    upsertCampusScheduleTemplate,
} from "../../../services/CampusScheduleTemplateService.jsx";
import {resolveSessionWindowFromWorkShifts} from "../../../utils/workShiftPolicy.js";
import {
    isAcademicCalendarLimitActive,
    normalizeAcademicCalendarShape,
    termIsComplete
} from "../../../utils/academicCalendarUi.js";
import {
    getCampusConfig,
    getSchoolCampusConfigList,
    parseSchoolCampusConfigListBody,
} from "../../../services/SchoolFacilityService.jsx";
import {useSchool} from "../../../contexts/SchoolContext.jsx";
import CounsellorAssignModal from "./CounsellorAssignModal.jsx";
import ScheduleSlotDetailModal from "./ScheduleSlotDetailModal.jsx";
import {
    getCounsellorAssignedSlots,
    getCounsellorAvailableList,
    parseCounsellorAssignedSlotsBody,
    parseCounsellorAssignSuccessBody,
    parseCounsellorAvailableListBody,
    postCounsellorAssign,
} from "../../../services/CampusCounsellorScheduleService.jsx";
import {assignmentRowBlocksUnassign, mapCounsellorUnassignApiErrorMessage,} from "../../../utils/counsellorAssignUi.js";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const DAY_LABELS = {
    MON: "Thứ 2",
    TUE: "Thứ 3",
    WED: "Thứ 4",
    THU: "Thứ 5",
    FRI: "Thứ 6",
    SAT: "Thứ 7",
    SUN: "CN",
};

const DAY_SHORT = {
    MON: "MON",
    TUE: "TUE",
    WED: "WED",
    THU: "THU",
    FRI: "FRI",
    SAT: "SAT",
    SUN: "SUN",
};

const SESSION_OPTIONS = ["MORNING", "AFTERNOON", "EVENING"];

/** Đồng bộ màu với SchoolCampaigns / Cơ sở */
const PRIMARY = "#0D64DE";
const PRIMARY_SOFT = "rgba(13, 100, 222, 0.1)";
const PAGE_BG = "#F1F5F9";
const SURFACE_CARD = "#FFFFFF";
const BORDER_SOFT = "rgba(148, 163, 184, 0.22)";
const SHADOW_SM = "0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 16px rgba(15, 23, 42, 0.06)";
const SHADOW_MD = "0 8px 30px rgba(15, 23, 42, 0.08)";
const SHADOW_HERO = "0 12px 40px rgba(13, 100, 222, 0.22)";
const RADIUS_CARD = "20px";
const RADIUS_INNER = "14px";
/** Mỗi cột ngày (Thứ + các khung giờ) trong lưới lịch tuần */
const SCHEDULE_DAY_COLUMN_PX = 200;
const TRANSITION_CARD = "box-shadow 0.22s cubic-bezier(0.4, 0, 0.2, 1), transform 0.22s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s ease";

const scheduleTabsSx = {
    minHeight: 48,
    bgcolor: "rgba(255,255,255,0.5)",
    borderRadius: "12px",
    px: 0.5,
    py: 0.5,
    border: `1px solid ${BORDER_SOFT}`,
    "& .MuiTabs-flexContainer": {gap: 0.5},
    "& .MuiTab-root": {
        minHeight: 44,
        px: 2.25,
        py: 1,
        textTransform: "none",
        fontSize: "0.875rem",
        fontFamily: '"Inter", "SF Pro Display", system-ui, sans-serif',
        color: "#64748b",
        fontWeight: 600,
        borderRadius: "10px",
        transition: "all 0.2s ease",
        "&:hover": {
            color: "#1e293b",
            bgcolor: "rgba(148, 163, 184, 0.1)",
        },
        "&.Mui-selected": {
            color: PRIMARY,
            fontWeight: 700,
            bgcolor: PRIMARY_SOFT,
        },
    },
    "& .MuiTabs-indicator": {
        display: "none",
    },
};

const filterSurfaceSx = {
    borderRadius: RADIUS_INNER,
    bgcolor: "rgba(248, 250, 252, 0.95)",
    border: `1px solid ${BORDER_SOFT}`,
    backgroundImage: "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.98) 100%)",
};

const outlineSelectSx = {
    borderRadius: "12px",
    "& .MuiOutlinedInput-root": {
        borderRadius: "12px",
        bgcolor: SURFACE_CARD,
        transition: "box-shadow 0.2s ease, border-color 0.2s ease",
        "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(100, 116, 139, 0.45)",
        },
        "&.Mui-focused": {
            boxShadow: `0 0 0 3px ${PRIMARY_SOFT}`,
        },
    },
};

function rowIsPrimaryCampus(r) {
    if (!r || typeof r !== "object") return false;
    if (r.isPrimaryBranch === true || r.is_primary_branch === true) return true;
    const n = String(r.campusName ?? r.campus_name ?? "")
        .trim()
        .toLowerCase();
    if (!n) return false;
    const hints = [
        "cơ sở chính",
        "co so chinh",
        "campus chính",
        "campus chinh",
        "trụ sở",
        "tru so",
        "head office",
        "headquarter",
    ];
    return hints.some((h) => n.includes(h));
}

function sortCampusConfigRowsPrimaryFirst(list) {
    if (!Array.isArray(list) || list.length < 2) return list;
    return [...list].sort((a, b) => {
        const aP = rowIsPrimaryCampus(a);
        const bP = rowIsPrimaryCampus(b);
        if (aP !== bP) return aP ? -1 : 1;
        return 0;
    });
}

function displayCampusConfigName(name, fallbackIndex) {
    const raw = name != null && String(name).trim() !== "" ? String(name).trim() : "";
    if (!raw) return `Cơ sở ${fallbackIndex + 1}`;
    return raw.replace(/\bcampus\s+chinh\b/gi, "Campus chính");
}

function sessionTypeLabel(s) {
    const v = String(s || "").toUpperCase();
    if (v === "MORNING") return "Buổi sáng";
    if (v === "AFTERNOON") return "Buổi chiều";
    if (v === "EVENING") return "Buổi tối";
    if (v === "FULL_DAY") return "Cả ngày";
    return s || "—";
}

/** yyyy-mm-dd → dd/mm/yyyy (vi-VN) */
function formatYmdVi(ymd) {
    const s = ymd != null ? String(ymd).trim() : "";
    if (s.length < 8) return s;
    const p = s.slice(0, 10).split("-").map((x) => Number(x));
    if (p.length !== 3 || p.some((n) => !Number.isFinite(n))) return s;
    const d = new Date(p[0], p[1] - 1, p[2]);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleDateString("vi-VN", {day: "2-digit", month: "2-digit", year: "numeric"});
}

/**
 * Thống kê ô lưới: mỗi dòng GET assigned = một lần gán; có thể nhiều khoảng ngày khác nhau cùng template/thứ.
 * @returns {{ assignmentCount: number, distinctRangeCount: number, rangeLines: string[] }}
 */
function summarizeGridCellAssignments(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
        return {assignmentCount: 0, distinctRangeCount: 0, rangeLines: []};
    }
    const assignmentCount = rows.length;
    const rangeMap = new Map();
    for (const r of rows) {
        const s = String(r?.startDate ?? "").slice(0, 10);
        const e = String(r?.endDate ?? "").slice(0, 10);
        if (!s || !e) continue;
        const k = `${s}|${e}`;
        rangeMap.set(k, (rangeMap.get(k) || 0) + 1);
    }
    const keys = [...rangeMap.keys()].sort();
    const rangeLines = keys.map((k) => {
        const [s, e] = k.split("|");
        const n = rangeMap.get(k);
        const label = `${formatYmdVi(s)} → ${formatYmdVi(e)}`;
        return n > 1 ? `${label} (${n} lượt)` : label;
    });
    return {
        assignmentCount,
        distinctRangeCount: rangeMap.size,
        rangeLines,
    };
}

function slotGridSelectionKey(slot, day) {
    const tid = Number(slot?.id ?? slot?.templateId);
    if (!Number.isFinite(tid) || tid <= 0) return null;
    return `${tid}|${day}`;
}

function timeToMinutes(t) {
    const parts = String(t || "0:0").split(":");
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1] ?? "0", 10);
    if (Number.isNaN(h) || Number.isNaN(m)) return 0;
    return h * 60 + m;
}

function minutesToHHmm(total) {
    const n = Math.max(0, Math.round(total));
    const h = Math.floor(n / 60) % 24;
    const m = n % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Preview khi bật tách theo slot: mỗi tiết `slotMinutes`, nghỉ `bufferMinutes` giữa hai tiết (chuẩn BE).
 * `remainder` = khung không vừa khít (còn khoảng trống sau tiết cuối).
 */
function computePolicySlotPreview(startTime, endTime, slotMinutes, bufferMinutes) {
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    const span = end - start;
    const slot = Number(slotMinutes);
    const buffer = Math.max(0, Number(bufferMinutes) || 0);
    if (!Number.isFinite(slot) || slot <= 0 || span <= 0) return {count: 0, labels: [], remainder: true};
    const labels = [];
    let t = start;
    let lastEnd = start;
    while (t + slot <= end) {
        lastEnd = t + slot;
        labels.push(`${minutesToHHmm(t)}–${minutesToHHmm(lastEnd)}`);
        t = lastEnd + buffer;
        if (labels.length >= 48) break;
    }
    const remainder = lastEnd !== end;
    return {count: labels.length, labels, remainder};
}

function intervalsOverlap(aStart, aEnd, bStart, bEnd) {
    return timeToMinutes(aStart) < timeToMinutes(bEnd) && timeToMinutes(bStart) < timeToMinutes(aEnd);
}

function slotIsActive(slot) {
    return slot?.active !== false;
}

function formatYMD(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function startOfWeekMonday(d) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = x.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    x.setDate(x.getDate() + diff);
    return x;
}

function endOfWeekSunday(d) {
    const s = startOfWeekMonday(d);
    const e = new Date(s);
    e.setDate(e.getDate() + 6);
    return e;
}

function startOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

/** Ngày đầu tiên trong tháng của `anchorDate` trùng thứ `dayKey` (MON…SUN). */
function firstWeekdayInMonthForDay(anchorDate, dayKey) {
    const y = anchorDate.getFullYear();
    const m = anchorDate.getMonth();
    const wantJs = {MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6, SUN: 0}[dayKey];
    const lastDay = new Date(y, m + 1, 0).getDate();
    for (let dom = 1; dom <= lastDay; dom++) {
        const t = new Date(y, m, dom);
        if (t.getDay() === wantJs) return t;
    }
    return new Date(y, m, 1);
}

function formatColumnHeaderDate(d) {
    if (!d || !(d instanceof Date) || Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("vi-VN", {day: "2-digit", month: "2-digit", year: "numeric"});
}

/** Hai khoảng [a0,a1] và [b0,b1] (YYYY-MM-DD) giao nhau */
function dateRangesOverlapYMD(aStart, aEnd, bStart, bEnd) {
    const as = String(aStart || "");
    const ae = String(aEnd || "");
    const bs = String(bStart || "");
    const be = String(bEnd || "");
    if (!as || !ae || !bs || !be) return true;
    return as <= be && bs <= ae;
}

function formatDateRangeVi(d0, d1) {
    const o = {day: "2-digit", month: "2-digit", year: "numeric"};
    return `${d0.toLocaleDateString("vi-VN", o)} – ${d1.toLocaleDateString("vi-VN", o)}`;
}

function assignedCounsellorLabel(c) {
    if (!c || typeof c !== "object") return "—";
    const n = c.name != null && String(c.name).trim() !== "" ? String(c.name).trim() : "";
    if (n) return n;
    return c.email ? String(c.email) : `ID ${c.id ?? "—"}`;
}

function getAssignedRowSlotId(row) {
    const raw = row?.slotId ?? row?.slot_id ?? row?.id;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
}

function getAssignedRowDayKey(row) {
    const sch = row?.schedule;
    if (!sch || typeof sch !== "object") return "";
    return String(sch.dayOfWeek ?? sch.day_of_week ?? "").toUpperCase();
}

function formatAssignedRowSlotLabel(row) {
    const sch = row?.schedule;
    if (!sch || typeof sch !== "object") return "—";
    const dow = getAssignedRowDayKey(row);
    const label = DAY_LABELS[dow] || dow;
    const st = String(sch.startTime ?? sch.start_time ?? "").trim();
    const en = String(sch.endTime ?? sch.end_time ?? "").trim();
    const timeRange = String(sch.time ?? "").trim();
    if (st && en) return `${label} · ${st}–${en}`;
    if (timeRange) return `${label} · ${timeRange}`;
    return label;
}

function sessionCardColors(sessionType) {
    const v = String(sessionType || "").toUpperCase();
    if (v === "MORNING") {
        return {
            bg: "linear-gradient(145deg, #FFFBF0 0%, #FFF7E6 100%)",
            border: "rgba(245, 158, 11, 0.35)",
            accent: "#B45309",
            label: "Sáng",
        };
    }
    if (v === "AFTERNOON") {
        return {
            bg: "linear-gradient(145deg, #F0F7FF 0%, #E8F2FE 100%)",
            border: "rgba(59, 130, 246, 0.35)",
            accent: "#1D4ED8",
            label: "Chiều",
        };
    }
    if (v === "EVENING") {
        return {
            bg: "linear-gradient(145deg, #FAF5FF 0%, #F3E8FF 100%)",
            border: "rgba(139, 92, 246, 0.35)",
            accent: "#6D28D9",
            label: "Tối",
        };
    }
    return {
        bg: "linear-gradient(145deg, #F8FAFC 0%, #F1F5F9 100%)",
        border: "rgba(148, 163, 184, 0.35)",
        accent: "#475569",
        label: sessionTypeLabel(sessionType),
    };
}

/** Nền / viền vùng cố định theo buổi (lưới tuần) */
function sessionZoneSurface(sessionType) {
    const v = String(sessionType || "").toUpperCase();
    if (v === "MORNING") {
        return {bg: "rgba(254, 243, 199, 0.42)", border: "rgba(245, 158, 11, 0.24)"};
    }
    if (v === "AFTERNOON") {
        return {bg: "rgba(219, 234, 254, 0.48)", border: "rgba(59, 130, 246, 0.22)"};
    }
    if (v === "EVENING") {
        return {bg: "rgba(237, 233, 254, 0.52)", border: "rgba(139, 92, 246, 0.22)"};
    }
    return {bg: "rgba(248, 250, 252, 0.95)", border: BORDER_SOFT};
}

function groupSlotsBySession(slots) {
    const out = {MORNING: [], AFTERNOON: [], EVENING: []};
    for (const s of slots) {
        const k = String(s?.sessionType || "").toUpperCase();
        if (out[k]) out[k].push(s);
        else out.MORNING.push(s);
    }
    for (const k of SESSION_OPTIONS) {
        out[k].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    }
    return out;
}

const emptyForm = () => ({
    templateId: 0,
    dayOfWeek: [],
    sessionType: "MORNING",
    expandToPolicySlots: false,
});

/** Map message từ BE (tiếng Anh) → tiếng Việt cho template lịch tư vấn */
const SCHEDULE_TEMPLATE_ERROR_VI = {
    "The requested time slot falls outside of operational shifts.":
        "Khung giờ không nằm trong ca vận hành đã cấu hình cho cơ sở.",
    "The requested time slot falls outside of operational shifts":
        "Khung giờ không nằm trong ca vận hành đã cấu hình cho cơ sở.",
};

function mapScheduleTemplateApiMessage(raw, fallback) {
    const t = String(raw ?? "").trim();
    if (!t) return fallback;
    const mapped = SCHEDULE_TEMPLATE_ERROR_VI[t];
    if (mapped) return mapped;
    return t;
}

function scheduleTemplateErrorMessage(error, fallback) {
    const fromApi = error?.response?.data?.message ?? error?.message;
    return mapScheduleTemplateApiMessage(fromApi, fallback);
}

export default function SchoolCounselorSchedule() {
    const {isPrimaryBranch, loading: schoolCtxLoading, currentCampusId} = useSchool();
    const [campusRows, setCampusRows] = useState([]);
    const [scheduleByDay, setScheduleByDay] = useState(() =>
        DAYS.reduce((acc, d) => {
            acc[d] = [];
            return acc;
        }, {})
    );
    const [loadingCampuses, setLoadingCampuses] = useState(true);
    const [loadingSchedule, setLoadingSchedule] = useState(false);
    const [sessionFilter, setSessionFilter] = useState("ALL");
    const [viewMode, setViewMode] = useState("manage");

    const [overviewRows, setOverviewRows] = useState([]);
    const [loadingOverview, setLoadingOverview] = useState(false);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [formErrors, setFormErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    /** Đọc từ GET /campus/config — ca, slot, ngày mở (bước 0 theo contract). */
    const [schedulePolicy, setSchedulePolicy] = useState({
        loading: false,
        error: null,
        slotDurationMinutes: 0,
        bufferBetweenSlotsMinutes: 0,
        stepMinutes: 0,
        minCounsellorsPerSlot: 1,
        maxCounsellorsPerSlot: 0,
        maxBookingPerSlot: 1,
        workShifts: [],
        regularDays: [],
        workingNote: "",
        academicCalendar: normalizeAcademicCalendarShape(null),
        academicSemesterLimitActive: false,
    });

    const [calendarGranularity, setCalendarGranularity] = useState("week");
    const [calendarAnchorDate, setCalendarAnchorDate] = useState(() => new Date());
    const [filterCounsellorId, setFilterCounsellorId] = useState("");
    const [counsellorFilterOptions, setCounsellorFilterOptions] = useState([]);
    const [assignedSlotRows, setAssignedSlotRows] = useState([]);
    const [loadingAssigned, setLoadingAssigned] = useState(false);
    const [counsellorModal, setCounsellorModal] = useState({
        open: false,
        slot: null,
        day: null,
        batchSlots: null,
    });
    /**
     * Lưới = template (GET schedule/templete/list) theo dayOfWeek — không có id «cả tuần» ảo.
     * Khóa ô: `${templateId}|${dayOfWeek}` (MON…SUN).
     */
    const [selectedFrameKeys, setSelectedFrameKeys] = useState(() => new Set());
    const [multiSelectMode, setMultiSelectMode] = useState(false);

    /** Lưới lịch (mặc định) · danh sách lượt gán */
    const [managePanel, setManagePanel] = useState("grid");
    const [listFilterDay, setListFilterDay] = useState("");
    const [listRangeStart, setListRangeStart] = useState("");
    const [listRangeEnd, setListRangeEnd] = useState("");
    const [selectedAssignmentSlotIds, setSelectedAssignmentSlotIds] = useState(() => new Set());
    const [unassignDialog, setUnassignDialog] = useState({open: false, rows: []});
    const [unassignSubmitting, setUnassignSubmitting] = useState(false);
    const [blockedUnassignSlotIds, setBlockedUnassignSlotIds] = useState(() => new Set());

    /** Modal chi tiết khung giờ + danh sách tư vấn viên */
    const [scheduleDetail, setScheduleDetail] = useState({open: false, slot: null, day: null});

    /** Một menu ⋮ cho mỗi thẻ khung giờ (thay 3 nút riêng) */
    const [slotActionsMenu, setSlotActionsMenu] = useState({anchorEl: null, slot: null, day: null});

    const closeSlotActionsMenu = useCallback(() => {
        setSlotActionsMenu({anchorEl: null, slot: null, day: null});
    }, []);

    const loadCampuses = useCallback(async () => {
        setLoadingCampuses(true);
        try {
            const schoolListPromise = isPrimaryBranch
                ? getSchoolCampusScheduleTemplateList({page: 0, pageSize: 200}).catch(() => null)
                : Promise.resolve(null);
            const [configRes, schoolScheduleRes] = await Promise.all([
                getSchoolCampusConfigList(),
                schoolListPromise,
            ]);

            if (configRes?.status !== 200) {
                throw new Error(configRes?.data?.message || "Không tải được danh sách cơ sở");
            }
            const fromConfig = sortCampusConfigRowsPrimaryFirst(parseSchoolCampusConfigListBody(configRes));
            const fromSchool =
                schoolScheduleRes?.status === 200 ? parseSchoolCampusScheduleTemplateListBody(schoolScheduleRes) : [];

            if (fromConfig.length > 0) {
                setCampusRows(fromConfig);
            } else if (fromSchool.length > 0) {
                setCampusRows(
                    fromSchool.map((c, i) => ({
                        campusId: c.campusId,
                        campusName: c.campusName || displayCampusConfigName(null, i),
                    }))
                );
            } else {
                setCampusRows([]);
            }
        } catch (e) {
            console.error(e);
            enqueueSnackbar(e?.response?.data?.message || e?.message || "Không tải được danh sách cơ sở.", {
                variant: "error",
            });
            setCampusRows([]);
        } finally {
            setLoadingCampuses(false);
        }
    }, [isPrimaryBranch]);

    /** Tab Xem tất cả: gộp mọi trang API (template phẳng) để mỗi campus có đủ lịch trong một lần hiển thị */
    const loadOverview = useCallback(async () => {
        setLoadingOverview(true);
        try {
            const rows = await fetchSchoolCampusScheduleTemplateListAll({pageSize: 200});
            setOverviewRows(rows);
        } catch (e) {
            console.error(e);
            enqueueSnackbar(e?.response?.data?.message || e?.message || "Không tải được tổng quan lịch.", {
                variant: "error",
            });
            setOverviewRows([]);
        } finally {
            setLoadingOverview(false);
        }
    }, []);

    useEffect(() => {
        if (schoolCtxLoading) return;
        loadCampuses();
    }, [loadCampuses, schoolCtxLoading]);

    useEffect(() => {
        if (!isPrimaryBranch && viewMode === "overview") {
            setViewMode("manage");
        }
    }, [isPrimaryBranch, viewMode]);

    useEffect(() => {
        if (viewMode === "overview" && isPrimaryBranch) {
            loadOverview();
        }
    }, [viewMode, loadOverview, isPrimaryBranch]);

    useEffect(() => {
        if (schoolCtxLoading || viewMode !== "manage") return;
        let cancelled = false;
        setSchedulePolicy((p) => ({...p, loading: true, error: null}));
        (async () => {
            try {
                const res = await getCampusConfig();
                if (cancelled) return;
                if (res?.status !== 200) {
                    throw new Error(res?.data?.message || "Không tải được cấu hình cơ sở");
                }
                const parsed = parseCampusSchedulePolicyFromConfigResponse(res);
                setSchedulePolicy({loading: false, error: null, ...parsed});
            } catch (e) {
                if (!cancelled) {
                    setSchedulePolicy({
                        loading: false,
                        error: e?.message || "Lỗi",
                        slotDurationMinutes: 0,
                        bufferBetweenSlotsMinutes: 0,
                        stepMinutes: 0,
                        minCounsellorsPerSlot: 1,
                        maxCounsellorsPerSlot: 0,
                        maxBookingPerSlot: 1,
                        workShifts: [],
                        regularDays: [],
                        workingNote: "",
                        academicCalendar: normalizeAcademicCalendarShape(null),
                        academicSemesterLimitActive: false,
                    });
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [viewMode, schoolCtxLoading]);

    /**
     * Campus đang thao tác: campus phụ → `currentCampusId`; campus chính → cơ sở đầu danh sách
     * (đã sort campus chính trước), không còn dropdown chọn cơ sở.
     */
    const activeCampus = useMemo(() => {
        if (!campusRows.length) return null;
        if (currentCampusId != null) {
            const hit = campusRows.find((c) => String(c.campusId ?? c.id) === String(currentCampusId));
            return hit ?? campusRows[0];
        }
        return campusRows[0] || null;
    }, [campusRows, currentCampusId]);

    /**
     * ID campus cho GET /campus/{id}/schedule/templete/list (chỉ path, không query) và các API payload;
     * ưu tiên context khi đăng nhập campus phụ, không thì từ dòng đang chọn.
     */
    const activeCampusId = useMemo(() => {
        if (currentCampusId != null) {
            const n = Number(currentCampusId);
            if (Number.isFinite(n)) return n;
        }
        const raw = activeCampus?.campusId ?? activeCampus?.id;
        if (raw == null || raw === "") return null;
        const n = Number(raw);
        return Number.isNaN(n) ? raw : n;
    }, [currentCampusId, activeCampus]);

    const activeCampusIndex = useMemo(() => {
        if (!activeCampus) return 0;
        const i = campusRows.findIndex(
            (c) => String(c.campusId ?? c.id) === String(activeCampus.campusId ?? activeCampus.id)
        );
        return i >= 0 ? i : 0;
    }, [campusRows, activeCampus]);

    const {viewStartStr, viewEndStr, calendarLabelText} = useMemo(() => {
        const d = calendarAnchorDate;
        if (calendarGranularity === "week") {
            const s = startOfWeekMonday(d);
            const e = endOfWeekSunday(d);
            return {
                viewStartStr: formatYMD(s),
                viewEndStr: formatYMD(e),
                calendarLabelText: formatDateRangeVi(s, e),
            };
        }
        const s = startOfMonth(d);
        const e = endOfMonth(d);
        return {
            viewStartStr: formatYMD(s),
            viewEndStr: formatYMD(e),
            calendarLabelText: s.toLocaleDateString("vi-VN", {month: "long", year: "numeric"}),
        };
    }, [calendarAnchorDate, calendarGranularity]);

    /** Mỗi cột MON…SUN: tuần → ngày trong tuần đang xem; tháng → ngày đầu tiên của thứ đó trong tháng. */
    const columnHeaderDates = useMemo(() => {
        const out = {};
        const anchor = calendarAnchorDate;
        if (calendarGranularity === "week") {
            const mon = startOfWeekMonday(anchor);
            for (let i = 0; i < DAYS.length; i++) {
                const d = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate());
                d.setDate(d.getDate() + i);
                out[DAYS[i]] = d;
            }
        } else {
            for (const day of DAYS) {
                out[day] = firstWeekdayInMonthForDay(anchor, day);
            }
        }
        return out;
    }, [calendarGranularity, calendarAnchorDate]);

    const loadAssignedSlots = useCallback(async () => {
        if (activeCampusId == null || viewMode !== "manage") {
            setAssignedSlotRows([]);
            return;
        }
        setLoadingAssigned(true);
        try {
            /** Luôn tải toàn bộ gán của cơ sở — lọc TVV chỉ áp dụng khi hiển thị lưới (tránh thiếu bản ghi khi có lọc). */
            const res = await getCounsellorAssignedSlots();
            const st = res?.status ?? 0;
            if (st < 200 || st >= 300) {
                throw new Error(res?.data?.message || "Không tải được lịch gán");
            }
            setAssignedSlotRows(parseCounsellorAssignedSlotsBody(res));
            setBlockedUnassignSlotIds(new Set());
        } catch (e) {
            console.error(e);
            enqueueSnackbar(e?.response?.data?.message || e?.message || "Không tải được lịch gán tư vấn viên.", {
                variant: "error",
            });
            setAssignedSlotRows([]);
            setBlockedUnassignSlotIds(new Set());
        } finally {
            setLoadingAssigned(false);
        }
    }, [activeCampusId, viewMode]);

    const runUnassignRows = useCallback(
        async (rows) => {
            const pairs = rows
                .map((r) => ({
                    sid: getAssignedRowSlotId(r),
                    cid: Number(r?.counsellor?.id ?? r?.counsellor_id),
                }))
                .filter((p) => p.sid != null);
            const slotIds = pairs.map((p) => p.sid);
            if (slotIds.length === 0) {
                enqueueSnackbar("Thiếu mã lịch gán (slotId).", {variant: "error"});
                return;
            }
            if (activeCampusId == null) return;
            setUnassignSubmitting(true);
            try {
                const payload = {
                    action: "UNASSIGN",
                    slotIds,
                };
                const counsellorIds = pairs.map((p) => p.cid);
                const allCounsellorKnown =
                    counsellorIds.length === slotIds.length && counsellorIds.every((c) => Number.isFinite(c));
                if (allCounsellorKnown) {
                    payload.counsellorIds = counsellorIds;
                }
                const res = await postCounsellorAssign(payload);
                const st = res && typeof res === "object" && "status" in res ? Number(res.status) : 0;
                if (st >= 200 && st < 300) {
                    const snap = parseCounsellorAssignSuccessBody(res);
                    const removedSlotIds = Array.isArray(snap?.removedSlotIds) ? snap.removedSlotIds : [];
                    const blockedSlotIds = Array.isArray(snap?.blockedSlotIds) ? snap.blockedSlotIds : [];
                    const blockedAppointmentDates = Array.isArray(snap?.blockedAppointmentDates)
                        ? snap.blockedAppointmentDates
                        : [];
                    const deletedCount = Number.isFinite(Number(snap?.deletedCount)) ? Number(snap.deletedCount) : null;
                    const blockedCount = Number.isFinite(Number(snap?.blockedCount)) ? Number(snap.blockedCount) : null;

                    if ((deletedCount ?? 0) > 0 && (blockedCount ?? 0) > 0) {
                        const dateText =
                            blockedAppointmentDates.length > 0
                                ? ` (${blockedAppointmentDates.map((d) => formatYmdVi(d)).join(", ")})`
                                : "";
                        enqueueSnackbar(
                            `Đã gỡ ${deletedCount} lịch. ${blockedCount} lịch giữ lại vì có lịch hẹn${dateText}.`,
                            {variant: "warning"}
                        );
                    } else if ((deletedCount ?? 0) > 0) {
                        enqueueSnackbar(
                            deletedCount > 1 ? `Đã gỡ ${deletedCount} lịch.` : "Gỡ lịch thành công.",
                            {variant: "success"}
                        );
                    } else if ((blockedCount ?? 0) > 0) {
                        enqueueSnackbar("Không thể hủy lịch vì đã có phụ huynh đăng ký.", {variant: "warning"});
                    } else {
                        enqueueSnackbar(
                            slotIds.length > 1 ? `Đã hủy gán ${slotIds.length} lượt.` : "Đã hủy gán tư vấn viên.",
                            {variant: "success"}
                        );
                    }

                    setBlockedUnassignSlotIds(new Set(blockedSlotIds));
                    if (snap?.slots && Array.isArray(snap.slots)) {
                        setAssignedSlotRows(snap.slots);
                    } else if (removedSlotIds.length > 0) {
                        const removedSet = new Set(removedSlotIds);
                        setAssignedSlotRows((prev) => prev.filter((r) => !removedSet.has(getAssignedRowSlotId(r))));
                    } else {
                        await loadAssignedSlots();
                    }
                    setSelectedAssignmentSlotIds(new Set());
                    setUnassignDialog({open: false, rows: []});
                }
            } catch (e) {
                const st = e?.response?.status;
                const raw = e?.response?.data?.message ?? e?.message ?? "";
                if (st === 401) {
                    enqueueSnackbar("Phiên đăng nhập hết hạn — vui lòng đăng nhập lại.", {variant: "error"});
                } else if (st === 403) {
                    enqueueSnackbar("Bạn không có quyền thực hiện thao tác này.", {variant: "error"});
                } else if (st === 400) {
                    enqueueSnackbar(
                        String(raw && String(raw).trim() ? raw : mapCounsellorUnassignApiErrorMessage(raw)),
                        {variant: "error"}
                    );
                } else {
                    enqueueSnackbar(raw || "Không thể hủy gán.", {variant: "error"});
                }
            } finally {
                setUnassignSubmitting(false);
            }
        },
        [activeCampusId, loadAssignedSlots]
    );

    useEffect(() => {
        if (viewMode !== "manage" || activeCampusId == null) return;
        loadAssignedSlots();
    }, [viewMode, activeCampusId, loadAssignedSlots]);

    useEffect(() => {
        if (viewMode !== "manage" || activeCampusId == null) {
            setCounsellorFilterOptions([]);
            return;
        }
        let cancelled = false;
        getCounsellorAvailableList()
            .then((res) => {
                if (cancelled) return;
                if (res?.status === 200) setCounsellorFilterOptions(parseCounsellorAvailableListBody(res));
                else setCounsellorFilterOptions([]);
            })
            .catch(() => {
                if (!cancelled) setCounsellorFilterOptions([]);
            });
        return () => {
            cancelled = true;
        };
    }, [viewMode, activeCampusId]);

    useEffect(() => {
        setSelectedAssignmentSlotIds(new Set());
    }, [listFilterDay, listRangeStart, listRangeEnd, filterCounsellorId, managePanel, sessionFilter]);

    /** Lọc theo TVV (trên client) — `assignedSlotRows` luôn đủ để hiển thị đúng mọi bản ghi trùng template/thứ. */
    const assignedRowsFilteredByCounsellor = useMemo(() => {
        if (filterCounsellorId === "" || filterCounsellorId === "ALL") return assignedSlotRows;
        const cid = Number(filterCounsellorId);
        if (Number.isNaN(cid)) return assignedSlotRows;
        return assignedSlotRows.filter((row) => Number(row?.counsellor?.id ?? row?.counsellor_id) === cid);
    }, [assignedSlotRows, filterCounsellorId]);

    const listViewRows = useMemo(() => {
        let rows = assignedRowsFilteredByCounsellor;
        if (listFilterDay) {
            rows = rows.filter((r) => getAssignedRowDayKey(r) === listFilterDay);
        }
        if (listRangeStart && listRangeEnd) {
            rows = rows.filter((r) =>
                dateRangesOverlapYMD(
                    String(r?.startDate ?? "").slice(0, 10),
                    String(r?.endDate ?? "").slice(0, 10),
                    listRangeStart,
                    listRangeEnd
                )
            );
        }
        if (sessionFilter !== "ALL") {
            rows = rows.filter(
                (r) =>
                    String(r?.schedule?.sessionType ?? r?.schedule?.session_type ?? "").toUpperCase() === sessionFilter
            );
        }
        return rows;
    }, [assignedRowsFilteredByCounsellor, listFilterDay, listRangeStart, listRangeEnd, sessionFilter]);

    const sortedListViewRows = useMemo(() => {
        const order = {MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6, SUN: 7};
        return [...listViewRows].sort((a, b) => {
            const da = order[getAssignedRowDayKey(a)] ?? 99;
            const db = order[getAssignedRowDayKey(b)] ?? 99;
            if (da !== db) return da - db;
            const schA = a?.schedule;
            const schB = b?.schedule;
            const ta = timeToMinutes(schA?.startTime ?? schA?.start_time ?? "");
            const tb = timeToMinutes(schB?.startTime ?? schB?.start_time ?? "");
            if (ta !== tb) return ta - tb;
            return assignedCounsellorLabel(a?.counsellor ?? {id: a?.counsellor_id}).localeCompare(
                assignedCounsellorLabel(b?.counsellor ?? {id: b?.counsellor_id}),
                "vi"
            );
        });
    }, [listViewRows]);

    const visibleAssignedRows = useMemo(() => {
        return assignedRowsFilteredByCounsellor.filter((row) =>
            dateRangesOverlapYMD(row.startDate, row.endDate, viewStartStr, viewEndStr)
        );
    }, [assignedRowsFilteredByCounsellor, viewStartStr, viewEndStr]);

    /** API đã trả bản ghi nhưng khoảng hiệu lực không giao với tuần/tháng đang xem → lưới không có chip */
    const assignedOutOfViewHint = useMemo(() => {
        if (assignedRowsFilteredByCounsellor.length === 0 || visibleAssignedRows.length > 0) return null;
        let minS = "";
        let maxE = "";
        for (const row of assignedRowsFilteredByCounsellor) {
            const s = String(row?.startDate ?? "").slice(0, 10);
            const e = String(row?.endDate ?? "").slice(0, 10);
            if (s && (!minS || s < minS)) minS = s;
            if (e && (!maxE || e > maxE)) maxE = e;
        }
        if (!minS && !maxE) return null;
        return {
            kind: "range",
            minS,
            maxE,
            label:
                minS && maxE
                    ? `${formatYmdVi(minS)} – ${formatYmdVi(maxE)}`
                    : minS
                        ? `từ ${formatYmdVi(minS)}`
                        : maxE
                            ? `đến ${formatYmdVi(maxE)}`
                            : "",
        };
    }, [assignedRowsFilteredByCounsellor, visibleAssignedRows]);

    /**
     * Lưới tuần = template (GET schedule/template) ghép assigned (GET counsellor/slots/assigned).
     * Cùng templateId + dayOfWeek → chip tư vấn viên; available theo ngày là API khác (khi cần).
     */
    const assignmentMap = useMemo(() => {
        const m = new Map();
        for (const row of visibleAssignedRows) {
            const sch = row?.schedule;
            if (!sch) continue;
            const tid = sch.templateId ?? sch.template_id;
            const dow = String(sch.dayOfWeek ?? sch.day_of_week ?? "").toUpperCase();
            if (tid == null || !DAYS.includes(dow)) continue;
            const key = `${Number(tid)}|${dow}`;
            if (!m.has(key)) m.set(key, []);
            m.get(key).push(row);
        }
        return m;
    }, [visibleAssignedRows]);

    const slotMenuAssignCount = useMemo(() => {
        const s = slotActionsMenu.slot;
        const d = slotActionsMenu.day;
        if (!s || !d) return 0;
        const tplId = Number(s.id ?? s.templateId);
        if (!Number.isFinite(tplId) || tplId <= 0) return 0;
        const key = `${tplId}|${d}`;
        return assignmentMap.get(key)?.length ?? 0;
    }, [slotActionsMenu.slot, slotActionsMenu.day, assignmentMap]);

    const counsellorGridApi = useMemo(() => {
        if (viewMode !== "manage") return null;
        return {
            map: assignmentMap,
            maxCounsellorsPerSlot: schedulePolicy.maxCounsellorsPerSlot ?? 0,
            minCounsellorsPerSlot: schedulePolicy.minCounsellorsPerSlot ?? 1,
            onAssign: (slot, day) => {
                setCounsellorModal({
                    open: true,
                    slot,
                    day,
                    batchSlots: null,
                });
            },
        };
    }, [viewMode, assignmentMap, scheduleByDay, schedulePolicy.maxCounsellorsPerSlot, schedulePolicy.minCounsellorsPerSlot]);

    useEffect(() => {
        if (!multiSelectMode) setSelectedFrameKeys(new Set());
    }, [multiSelectMode]);

    const openBatchAssignFromSelection = useCallback(() => {
        const batchSlots = [];
        for (const key of selectedFrameKeys) {
            const pipe = key.indexOf("|");
            if (pipe < 0) continue;
            const tid = Number(key.slice(0, pipe));
            const day = key.slice(pipe + 1);
            if (!DAYS.includes(day)) continue;
            const slots = scheduleByDay[day] || [];
            const slot = slots.find((s) => Number(s.id ?? s.templateId) === tid);
            if (slot) batchSlots.push({slot, day});
        }
        if (batchSlots.length === 0) {
            enqueueSnackbar("Chọn ít nhất một khung giờ.", {variant: "info"});
            return;
        }
        setCounsellorModal({
            open: true,
            slot: batchSlots[0].slot,
            day: batchSlots[0].day,
            batchSlots,
        });
    }, [selectedFrameKeys, scheduleByDay]);

    const selectableGridFrameKeys = useMemo(() => {
        const keys = [];
        for (const day of DAYS) {
            const slots = scheduleByDay[day] || [];
            for (const slot of slots) {
                if (!slotIsActive(slot)) continue;
                if (sessionFilter !== "ALL" && String(slot.sessionType || "").toUpperCase() !== sessionFilter) continue;
                const selKey = slotGridSelectionKey(slot, day);
                if (selKey) keys.push(selKey);
            }
        }
        return keys;
    }, [scheduleByDay, sessionFilter]);

    const allGridSlotsSelected = selectableGridFrameKeys.length > 0 && selectedFrameKeys.size === selectableGridFrameKeys.length;
    const partialGridSlotsSelected = selectedFrameKeys.size > 0 && !allGridSlotsSelected;

    const onToggleSelectAllGridSlots = useCallback(
        (_, checked) => {
            if (!checked) {
                setSelectedFrameKeys(new Set());
                return;
            }
            setMultiSelectMode(true);
            setSelectedFrameKeys(new Set(selectableGridFrameKeys));
        },
        [selectableGridFrameKeys]
    );

    const scheduleDetailAssigns = useMemo(() => {
        const {open, slot, day} = scheduleDetail;
        if (!open || !slot || !day) return [];
        const tplId = Number(slot.id ?? slot.templateId);
        const mapKey = Number.isFinite(tplId) && tplId > 0 ? `${tplId}|${day}` : null;
        if (!mapKey || !assignmentMap.has(mapKey)) return [];
        return [...assignmentMap.get(mapKey)];
    }, [scheduleDetail, assignmentMap]);

    const shiftCalendar = (dir) => {
        setCalendarAnchorDate((prev) => {
            const d = new Date(prev);
            if (calendarGranularity === "week") d.setDate(d.getDate() + dir * 7);
            else d.setMonth(d.getMonth() + dir);
            return d;
        });
    };

    const loadScheduleForCampus = useCallback(async (campusId) => {
        if (campusId == null) {
            setScheduleByDay(normalizeScheduleTemplateDayMap({}));
            return;
        }
        setLoadingSchedule(true);
        try {
            const res = await getCampusScheduleTemplateList(campusId);
            if (res?.status !== 200) {
                throw new Error(res?.data?.message || "Không tải được lịch");
            }
            setScheduleByDay(parseCampusScheduleTemplateListBody(res));
        } catch (e) {
            console.error(e);
            enqueueSnackbar(e?.response?.data?.message || e?.message || "Không tải được khung giờ tư vấn.", {
                variant: "error",
            });
            setScheduleByDay(normalizeScheduleTemplateDayMap({}));
        } finally {
            setLoadingSchedule(false);
        }
    }, []);

    useEffect(() => {
        if (viewMode === "manage" && activeCampusId != null) {
            loadScheduleForCampus(activeCampusId);
        }
    }, [activeCampusId, loadScheduleForCampus, viewMode]);

    const isEditing = (form.templateId || 0) > 0;

    const openDaySet = useMemo(() => new Set(schedulePolicy.regularDays || []), [schedulePolicy.regularDays]);

    const sessionWindowPreview = useMemo(
        () => resolveSessionWindowFromWorkShifts(schedulePolicy.workShifts, form.sessionType),
        [schedulePolicy.workShifts, form.sessionType]
    );

    const slotSplitPreview = useMemo(() => {
        if (!form.expandToPolicySlots || isEditing) return {count: 0, labels: [], remainder: false};
        const win = resolveSessionWindowFromWorkShifts(schedulePolicy.workShifts, form.sessionType);
        if (!win) return {count: 0, labels: [], remainder: false};
        return computePolicySlotPreview(
            win.start,
            win.end,
            schedulePolicy.slotDurationMinutes,
            schedulePolicy.bufferBetweenSlotsMinutes
        );
    }, [
        form.expandToPolicySlots,
        form.sessionType,
        isEditing,
        schedulePolicy.slotDurationMinutes,
        schedulePolicy.bufferBetweenSlotsMinutes,
        schedulePolicy.workShifts,
    ]);

    const openCreate = () => {
        setForm(emptyForm());
        setFormErrors({});
        setDialogOpen(true);
    };

    const openEdit = (slot, fallbackDay) => {
        const fromApi =
            slot?.dayOfWeek && DAYS.includes(String(slot.dayOfWeek).toUpperCase())
                ? String(slot.dayOfWeek).toUpperCase()
                : null;
        const day = fromApi || (fallbackDay && DAYS.includes(fallbackDay) ? fallbackDay : null);
        setForm({
            templateId: slot?.id ?? 0,
            dayOfWeek: day ? [day] : [],
            sessionType: String(slot?.sessionType || "MORNING").toUpperCase(),
            expandToPolicySlots: false,
        });
        setFormErrors({});
        setDialogOpen(true);
    };

    const toggleDay = (day) => {
        if (!isEditing && openDaySet.size > 0 && !openDaySet.has(day)) return;
        if (isEditing) {
            setForm((prev) => ({...prev, dayOfWeek: [day]}));
            return;
        }
        setForm((prev) => {
            const set = new Set(prev.dayOfWeek);
            if (set.has(day)) set.delete(day);
            else set.add(day);
            return {...prev, dayOfWeek: [...set].sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b))};
        });
    };

    const selectWeekdays = () => {
        if (isEditing) return;
        const base = ["MON", "TUE", "WED", "THU", "FRI"];
        const days = openDaySet.size > 0 ? base.filter((d) => openDaySet.has(d)) : base;
        setForm((prev) => ({...prev, dayOfWeek: days}));
    };

    const selectWeekend = () => {
        if (isEditing) return;
        const base = ["SAT", "SUN"];
        const days = openDaySet.size > 0 ? base.filter((d) => openDaySet.has(d)) : base;
        setForm((prev) => ({...prev, dayOfWeek: days}));
    };

    /** Trùng: cùng thứ + cùng buổi (session) — khung giờ do BE gán từ ca HQ. */
    const checkSessionDayOverlap = useCallback(
        (sessionType, selectedDays, excludeTemplateId) => {
            const st = String(sessionType || "").toUpperCase();
            for (const d of selectedDays) {
                const slots = scheduleByDay[d] || [];
                for (const s of slots) {
                    if (!slotIsActive(s)) continue;
                    if (excludeTemplateId && Number(s.id) === Number(excludeTemplateId)) continue;
                    if (String(s.sessionType || "").toUpperCase() === st) {
                        return {day: d, other: s};
                    }
                }
            }
            return null;
        },
        [scheduleByDay]
    );

    const validate = () => {
        const err = {};
        if (!form.dayOfWeek?.length) err.dayOfWeek = "Chọn ít nhất một ngày";
        if (!form.sessionType?.trim()) err.session = "Chọn buổi (sáng / chiều / tối).";

        if (isEditing && form.dayOfWeek?.length !== 1) {
            err.dayOfWeek = "Sửa khung chỉ áp dụng đúng một thứ trong tuần";
        }

        const sessionWin = resolveSessionWindowFromWorkShifts(schedulePolicy.workShifts, form.sessionType);
        if (form.sessionType?.trim() && !sessionWin) {
            err.session =
                "Chưa có giờ cho buổi này trong dữ liệu đã tải. Vui lòng nhờ trụ sở kiểm tra phần giờ làm việc và ca trong Cấu hình vận hành.";
        }

        if (!isEditing && form.expandToPolicySlots) {
            if (!schedulePolicy.slotDurationMinutes || schedulePolicy.slotDurationMinutes <= 0) {
                err.expandSlots = "Chưa cấu hình độ dài mỗi cuộc hẹn (mục Độ dài slot). Không thể chia nhỏ lịch.";
            } else if (sessionWin) {
                const span = timeToMinutes(sessionWin.end) - timeToMinutes(sessionWin.start);
                if (span <= 0) {
                    err.expandSlots = "Khung giờ dự kiến không hợp lệ — không thể chia nhỏ.";
                } else {
                    const prv = computePolicySlotPreview(
                        sessionWin.start,
                        sessionWin.end,
                        schedulePolicy.slotDurationMinutes,
                        schedulePolicy.bufferBetweenSlotsMinutes
                    );
                    if (prv.remainder || prv.count === 0) {
                        const buf = Math.max(0, Number(schedulePolicy.bufferBetweenSlotsMinutes) || 0);
                        err.expandSlots =
                            buf > 0
                                ? `Khung giờ này không thể tách thành các tiết liên tiếp đúng theo cấu hình (mỗi tiết ${schedulePolicy.slotDurationMinutes} phút, nghỉ ${buf} phút giữa hai tiết). Nếu vẫn lỗi khi lưu, thử chỉnh khung giờ ca ở trụ sở cho khớp công thức nhiều tiết + nghỉ, hoặc xem thông báo từ máy chủ.`
                                : `Khung giờ này không thể tách đều thành các đoạn ${schedulePolicy.slotDurationMinutes} phút (vừa khít cả khung). Nếu vẫn lỗi khi lưu, nhờ trụ sở kiểm tra ca hoặc xem thông báo API.`;
                    }
                }
            }
        }

        if (!err.dayOfWeek && !err.session && Array.isArray(form.dayOfWeek) && form.dayOfWeek.length > 0) {
            const hit = checkSessionDayOverlap(form.sessionType, form.dayOfWeek, isEditing ? form.templateId : 0);
            if (hit) {
                err.overlap = `Ngày ${DAY_LABELS[hit.day]} đã có lịch ${sessionTypeLabel(hit.other.sessionType)}. Chọn ngày khác hoặc sửa lịch cũ.`;
            }
        }

        setFormErrors(err);
        return Object.keys(err).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate() || activeCampusId == null) return;
        setSubmitting(true);
        try {
            const payload = buildUpsertCampusScheduleTemplatePayload({
                templateId: form.templateId,
                dayOfWeek: form.dayOfWeek,
                sessionType: String(form.sessionType).trim(),
                expandToPolicySlots: !isEditing && form.expandToPolicySlots,
            });
            const res = await upsertCampusScheduleTemplate(payload);
            const ok = res && res.status >= 200 && res.status < 300;
            if (ok) {
                enqueueSnackbar(form.templateId ? "Đã cập nhật khung giờ." : "Đã thêm khung giờ.", {variant: "success"});
                setDialogOpen(false);
                await loadScheduleForCampus(activeCampusId);
                await loadAssignedSlots();
            } else {
                enqueueSnackbar(mapScheduleTemplateApiMessage(res?.data?.message, "Lưu không thành công."), {variant: "error"});
            }
        } catch (e) {
            console.error(e);
            enqueueSnackbar(scheduleTemplateErrorMessage(e, "Lưu không thành công."), {variant: "error"});
        } finally {
            setSubmitting(false);
        }
    };

    const filterSlot = (slot) => {
        if (sessionFilter === "ALL") return true;
        return String(slot.sessionType || "").toUpperCase() === sessionFilter;
    };

    const renderWeeklyGrid = (
        byDay,
        {
            readOnly = false,
            campusLabel = "",
            applySessionFilter = true,
            counsellor = null,
            columnHeaderDates: headerDates = null,
        } = {}
    ) => {
        const slotKey = (slot, day) => slot.id ?? `${day}-${slot.startTime}-${String(slot.sessionType || "")}`;

        const renderSlotItem = (slot, day) => {
            const colors = sessionCardColors(slot.sessionType);
            const tipCampus =
                campusLabel ||
                displayCampusConfigName(activeCampus?.campusName ?? activeCampus?.campus_name, activeCampusIndex);
            const tip = [`${slot.startTime} – ${slot.endTime}`, sessionTypeLabel(slot.sessionType), tipCampus].join(" · ");
            const tplId = Number(slot.id ?? slot.templateId);
            const mapKey = Number.isFinite(tplId) && tplId > 0 ? `${tplId}|${day}` : null;
            const assigns =
                counsellor && mapKey && counsellor.map?.has(mapKey) ? [...counsellor.map.get(mapKey)] : [];
            const showCounsellorUi = Boolean(counsellor && counsellor.map && !readOnly);
            const emptyStaff = slotIsActive(slot) && assigns.length === 0;
            const maxCap = counsellor?.maxCounsellorsPerSlot ?? 0;
            const selKey = slotGridSelectionKey(slot, day);
            const isSlotSelected = Boolean(multiSelectMode && selKey && selectedFrameKeys.has(selKey));
            const cellAssignSummary = assigns.length > 0 ? summarizeGridCellAssignments(assigns) : null;

            if (showCounsellorUi) {
                return (
                    <Box
                        key={slotKey(slot, day)}
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                            if (selKey && slotIsActive(slot) && (e.ctrlKey || e.metaKey)) {
                                e.preventDefault();
                                setMultiSelectMode(true);
                                setSelectedFrameKeys((prev) => {
                                    const n = new Set(prev);
                                    if (n.has(selKey)) n.delete(selKey);
                                    else n.add(selKey);
                                    return n;
                                });
                                return;
                            }
                            if (multiSelectMode && selKey) {
                                setSelectedFrameKeys((prev) => {
                                    const n = new Set(prev);
                                    if (n.has(selKey)) n.delete(selKey);
                                    else n.add(selKey);
                                    return n;
                                });
                                return;
                            }
                            setScheduleDetail({open: true, slot, day});
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                if (multiSelectMode && selKey) {
                                    setSelectedFrameKeys((prev) => {
                                        const n = new Set(prev);
                                        if (n.has(selKey)) n.delete(selKey);
                                        else n.add(selKey);
                                        return n;
                                    });
                                    return;
                                }
                                setScheduleDetail({open: true, slot, day});
                            }
                        }}
                        sx={{
                            position: "relative",
                            p: 1.35,
                            borderRadius: RADIUS_INNER,
                            background: colors.bg,
                            border: isSlotSelected
                                ? `2px solid ${PRIMARY}`
                                : emptyStaff
                                    ? `2px dashed ${colors.border}`
                                    : `1px solid ${colors.border}`,
                            boxShadow: SHADOW_SM,
                            opacity: slotIsActive(slot) ? 1 : 0.55,
                            transition: TRANSITION_CARD,
                            cursor: "pointer",
                            outline: "none",
                            "&:focus-visible": {
                                boxShadow: `0 0 0 2px #fff, 0 0 0 4px ${PRIMARY}`,
                            },
                            "&:hover": {
                                boxShadow: SHADOW_MD,
                                transform: "translateY(-2px)",
                            },
                        }}
                    >
                        {multiSelectMode && slotIsActive(slot) && selKey ? (
                            <Checkbox
                                size="small"
                                checked={isSlotSelected}
                                onClick={(e) => e.stopPropagation()}
                                onChange={() => {
                                    setSelectedFrameKeys((prev) => {
                                        const n = new Set(prev);
                                        if (n.has(selKey)) n.delete(selKey);
                                        else n.add(selKey);
                                        return n;
                                    });
                                }}
                                inputProps={{"aria-label": "Chọn khung để gán hàng loạt"}}
                                sx={{
                                    position: "absolute",
                                    top: 4,
                                    left: 2,
                                    p: 0.25,
                                    zIndex: 2,
                                    bgcolor: "rgba(255,255,255,0.9)",
                                    borderRadius: "8px",
                                }}
                            />
                        ) : null}
                        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={0.75}>
                            <Box sx={{flex: 1, minWidth: 0, pr: 0.25}}>
                                <Typography
                                    sx={{
                                        fontWeight: 800,
                                        fontSize: "0.8125rem",
                                        color: "#0F172A",
                                        fontVariantNumeric: "tabular-nums",
                                        letterSpacing: "-0.01em",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                    }}
                                >
                                    {slot.startTime} – {slot.endTime}
                                </Typography>
                                <Typography
                                    sx={{
                                        fontSize: "0.72rem",
                                        color: colors.accent,
                                        fontWeight: 700,
                                        mt: 0.35,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.04em",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                    }}
                                >
                                    {sessionTypeLabel(slot.sessionType)}
                                </Typography>
                            </Box>
                            {slotIsActive(slot) ? (
                                <Tooltip title="Chi tiết khung, sửa template, gán…" arrow>
                                    <IconButton
                                        size="small"
                                        aria-label="Menu khung giờ"
                                        aria-haspopup="true"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSlotActionsMenu({anchorEl: e.currentTarget, slot, day});
                                        }}
                                        sx={{
                                            width: 30,
                                            height: 30,
                                            flexShrink: 0,
                                            bgcolor: "rgba(255,255,255,0.95)",
                                            border: `1px solid ${BORDER_SOFT}`,
                                            borderRadius: "10px",
                                            "&:hover": {bgcolor: "#fff", borderColor: "rgba(148,163,184,0.45)"},
                                        }}
                                    >
                                        <MoreVertIcon sx={{fontSize: 18, color: "#64748B"}}/>
                                    </IconButton>
                                </Tooltip>
                            ) : null}
                        </Stack>
                        {slotIsActive(slot) ? null : (
                            <Chip
                                label="Ngưng"
                                size="small"
                                sx={{
                                    mt: 0.75,
                                    height: 24,
                                    fontSize: "0.65rem",
                                    fontWeight: 700,
                                    bgcolor: "rgba(100,116,139,0.12)",
                                    color: "#475569",
                                    border: "1px solid rgba(100,116,139,0.2)",
                                }}
                            />
                        )}
                        <Typography
                            variant="caption"
                            sx={{
                                color: assigns.length === 0 ? "#94A3B8" : "#334155",
                                textAlign: "center",
                                display: "block",
                                mt: slotIsActive(slot) ? 1 : 0.75,
                                py: 0.5,
                                fontWeight: assigns.length === 0 ? 500 : 700,
                            }}
                        >
                            {assigns.length === 0
                                ? "Chưa có lượt gán"
                                : cellAssignSummary &&
                                `${cellAssignSummary.assignmentCount} lượt gán${
                                    cellAssignSummary.distinctRangeCount > 1
                                        ? ` · ${cellAssignSummary.distinctRangeCount} khoảng ngày`
                                        : ""
                                }`}
                        </Typography>
                        {cellAssignSummary && cellAssignSummary.rangeLines.length > 0 ? (
                            <Stack spacing={0.15} sx={{mt: 0.2, px: 0.5, alignItems: "center"}}>
                                {cellAssignSummary.rangeLines.map((line, idx) => (
                                    <Typography
                                        key={`${line}-${idx}`}
                                        variant="caption"
                                        sx={{
                                            display: "block",
                                            textAlign: "center",
                                            color: "#64748B",
                                            fontSize: "0.65rem",
                                            lineHeight: 1.35,
                                        }}
                                    >
                                        {line}
                                    </Typography>
                                ))}
                            </Stack>
                        ) : null}
                        {slotIsActive(slot) && maxCap > 0 && showCounsellorUi ? (
                            <Stack direction="row" justifyContent="center" flexWrap="wrap" gap={0.5} sx={{mt: 0.35}}>
                                {assigns.length >= maxCap ? (
                                    <Chip
                                        label="Đã đủ tư vấn viên"
                                        size="small"
                                        sx={{
                                            height: 22,
                                            fontSize: "0.62rem",
                                            fontWeight: 800,
                                            bgcolor: "rgba(71,85,105,0.12)",
                                            color: "#334155"
                                        }}
                                    />
                                ) : assigns.length > 0 && maxCap > 1 && assigns.length === maxCap - 1 ? (
                                    <Chip
                                        label="Còn 1 suất"
                                        size="small"
                                        color="warning"
                                        variant="outlined"
                                        sx={{height: 22, fontSize: "0.62rem", fontWeight: 700}}
                                    />
                                ) : null}
                            </Stack>
                        ) : null}
                    </Box>
                );
            }

            return (
                <Tooltip key={slotKey(slot, day)} title={tip} placement="top" arrow>
                    <Box
                        role={readOnly ? undefined : "button"}
                        tabIndex={readOnly ? undefined : 0}
                        onClick={readOnly ? undefined : () => openEdit(slot, day)}
                        onKeyDown={
                            readOnly
                                ? undefined
                                : (e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        openEdit(slot, day);
                                    }
                                }
                        }
                        sx={{
                            position: "relative",
                            p: 1.35,
                            borderRadius: RADIUS_INNER,
                            background: colors.bg,
                            border: `1px solid ${colors.border}`,
                            boxShadow: SHADOW_SM,
                            opacity: slotIsActive(slot) ? 1 : 0.55,
                            transition: TRANSITION_CARD,
                            ...(readOnly
                                ? {}
                                : {
                                    cursor: "pointer",
                                    outline: "none",
                                    "&:focus-visible": {
                                        boxShadow: `0 0 0 2px #fff, 0 0 0 4px ${PRIMARY}`,
                                    },
                                }),
                            "&:hover": readOnly
                                ? {}
                                : {
                                    boxShadow: SHADOW_MD,
                                    transform: "translateY(-2px)",
                                },
                        }}
                    >
                        <Typography sx={{fontWeight: 700, fontSize: "0.8125rem", color: "#0F172A"}}>
                            {slot.startTime} – {slot.endTime}
                        </Typography>
                        <Typography sx={{fontSize: "0.75rem", color: colors.accent, fontWeight: 600, mt: 0.25}}>
                            {sessionTypeLabel(slot.sessionType)}
                        </Typography>
                        {slotIsActive(slot) ? null : (
                            <Chip
                                label="Ngưng"
                                size="small"
                                sx={{
                                    mt: 0.75,
                                    height: 24,
                                    fontSize: "0.65rem",
                                    fontWeight: 700,
                                    bgcolor: "rgba(100,116,139,0.12)",
                                    color: "#475569",
                                    border: "1px solid rgba(100,116,139,0.2)",
                                }}
                            />
                        )}
                    </Box>
                </Tooltip>
            );
        };

        return (
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: `repeat(7, ${SCHEDULE_DAY_COLUMN_PX}px)`,
                    width: "max-content",
                    maxWidth: "100%",
                    gap: {xs: 1.25, md: 1.75},
                    overflowX: "auto",
                    pb: 1,
                    mx: -0.25,
                    px: 0.25,
                }}
            >
                {DAYS.map((day) => {
                    const slots = (byDay[day] || []).filter((s) => (applySessionFilter ? filterSlot(s) : true));
                    const bySession = groupSlotsBySession(slots);
                    return (
                        <Box
                            key={day}
                            sx={{
                                minHeight: 460,
                                background: `linear-gradient(180deg, ${SURFACE_CARD} 0%, #F8FAFC 100%)`,
                                borderRadius: RADIUS_INNER,
                                border: `1px solid ${BORDER_SOFT}`,
                                p: 1.5,
                                display: "flex",
                                flexDirection: "column",
                                gap: 0,
                                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
                            }}
                        >
                            <Box
                                sx={{
                                    textAlign: "center",
                                    pb: 1.25,
                                    mb: 1,
                                    borderBottom: `1px dashed ${BORDER_SOFT}`,
                                }}
                            >
                                <Typography
                                    sx={{
                                        fontSize: "0.8125rem",
                                        fontWeight: 800,
                                        color: PRIMARY,
                                        display: "block",
                                        letterSpacing: "-0.01em",
                                    }}
                                >
                                    {DAY_LABELS[day]}
                                </Typography>
                                {headerDates?.[day] ? (
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: "#64748B",
                                            fontWeight: 600,
                                            display: "block",
                                            mt: 0.5,
                                            fontSize: "0.75rem",
                                            fontVariantNumeric: "tabular-nums",
                                        }}
                                    >
                                        {formatColumnHeaderDate(headerDates[day])}
                                    </Typography>
                                ) : null}
                            </Box>
                            <Stack spacing={0.75} sx={{display: "flex", flexDirection: "column"}}>
                                {SESSION_OPTIONS.map((sessionKey) => {
                                    const zoneSlots = bySession[sessionKey];
                                    const surface = sessionZoneSurface(sessionKey);
                                    return (
                                        <Box
                                            key={sessionKey}
                                            sx={{
                                                minHeight: zoneSlots.length === 0 ? 104 : "auto",
                                                display: "flex",
                                                flexDirection: "column",
                                                borderRadius: "10px",
                                                border: `1px solid ${surface.border}`,
                                                bgcolor: surface.bg,
                                                p: 0.75,
                                                gap: 0.75,
                                            }}
                                        >
                                            {zoneSlots.length === 0 ? (
                                                <Box
                                                    sx={{
                                                        flex: 1,
                                                        minHeight: 72,
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        px: 0.5,
                                                    }}
                                                >
                                                    <Typography variant="caption"
                                                                sx={{color: "#94A3B8", fontWeight: 500}}>
                                                        —
                                                    </Typography>
                                                </Box>
                                            ) : (
                                                <Stack
                                                    spacing={1}>{zoneSlots.map((slot) => renderSlotItem(slot, day))}</Stack>
                                            )}
                                        </Box>
                                    );
                                })}
                            </Stack>
                        </Box>
                    );
                })}
            </Box>
        );
    };

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2.5,
                width: "100%",
                pb: 5,
                pt: 0.5,
                fontFamily: '"Inter", "SF Pro Display", system-ui, sans-serif',
                bgcolor: PAGE_BG,
                minHeight: "100%",
            }}
        >
            <Box
                sx={{
                    position: "relative",
                    overflow: "hidden",
                    borderRadius: RADIUS_CARD,
                    p: {xs: 2.5, sm: 3.5},
                    color: "white",
                    boxShadow: SHADOW_HERO,
                    background: "linear-gradient(128deg, #5B9BD8 0%, #0D64DE 42%, #064CAD 100%)",
                    "&::before": {
                        content: '""',
                        position: "absolute",
                        top: "-40%",
                        right: "-8%",
                        width: "52%",
                        height: "140%",
                        background: "radial-gradient(ellipse at center, rgba(255,255,255,0.22) 0%, transparent 68%)",
                        pointerEvents: "none",
                    },
                    "&::after": {
                        content: '""',
                        position: "absolute",
                        bottom: "-30%",
                        left: "-10%",
                        width: "45%",
                        height: "100%",
                        background: "radial-gradient(ellipse at center, rgba(255,255,255,0.08) 0%, transparent 65%)",
                        pointerEvents: "none",
                    },
                }}
            >
                <Box
                    sx={{
                        position: "relative",
                        zIndex: 1,
                        display: "flex",
                        flexDirection: {xs: "column", sm: "row"},
                        alignItems: {xs: "stretch", sm: "center"},
                        justifyContent: "space-between",
                        gap: 2.5,
                    }}
                >
                    <Box sx={{maxWidth: {sm: "62%"}}}>
                        <Typography
                            variant="overline"
                            sx={{
                                display: "block",
                                letterSpacing: "0.12em",
                                fontWeight: 700,
                                opacity: 0.88,
                                fontSize: "0.68rem",
                                mb: 0.75,
                            }}
                        >
                            Lịch làm việc
                        </Typography>
                        <Typography
                            variant="h4"
                            sx={{
                                fontWeight: 800,
                                letterSpacing: "-0.03em",
                                lineHeight: 1.15,
                                fontSize: {xs: "1.5rem", sm: "1.85rem"},
                            }}
                        >
                            Lịch tư vấn viên
                        </Typography>
                        <Typography variant="body2" sx={{mt: 1.25, opacity: 0.92, lineHeight: 1.55, maxWidth: 520}}>
                            Thiết lập khung giờ template, gán tư vấn viên và theo dõi lịch theo tuần hoặc tháng.
                        </Typography>
                    </Box>
                    {viewMode === "manage" ? (
                        <Button
                            variant="contained"
                            startIcon={<AddIcon/>}
                            disabled={activeCampusId == null || loadingCampuses}
                            onClick={openCreate}
                            sx={{
                                alignSelf: {xs: "stretch", sm: "center"},
                                bgcolor: "rgba(255,255,255,0.98)",
                                color: PRIMARY,
                                borderRadius: "14px",
                                textTransform: "none",
                                fontWeight: 700,
                                px: 3,
                                py: 1.35,
                                boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
                                border: "1px solid rgba(255,255,255,0.55)",
                                "&:hover": {
                                    bgcolor: "#fff",
                                    boxShadow: "0 8px 28px rgba(0,0,0,0.16)",
                                },
                                "&.Mui-disabled": {
                                    bgcolor: "rgba(255,255,255,0.45)",
                                    color: "rgba(255,255,255,0.85)",
                                },
                            }}
                        >
                            Thêm
                        </Button>
                    ) : null}
                </Box>
            </Box>

            <Card
                elevation={0}
                sx={{
                    borderRadius: RADIUS_CARD,
                    border: `1px solid ${BORDER_SOFT}`,
                    boxShadow: SHADOW_SM,
                    bgcolor: SURFACE_CARD,
                    overflow: "hidden",
                }}
            >
                <Box
                    sx={{
                        px: {xs: 2, sm: 3},
                        pt: {xs: 2.5, sm: 3},
                        pb: 2,
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 2,
                        borderBottom: `1px solid ${BORDER_SOFT}`,
                        background: "linear-gradient(180deg, rgba(248,250,252,0.65) 0%, rgba(255,255,255,0) 100%)",
                    }}
                >
                    <Box
                        sx={{
                            width: 48,
                            height: 48,
                            borderRadius: "14px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            bgcolor: PRIMARY_SOFT,
                            border: `1px solid rgba(13,100,222,0.12)`,
                            flexShrink: 0,
                        }}
                    >
                        <EventAvailableIcon sx={{color: PRIMARY, fontSize: 26}}/>
                    </Box>
                    <Box sx={{minWidth: 0}}>
                        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                            <Typography variant="h6" sx={{
                                fontWeight: 800,
                                color: "#0f172a",
                                lineHeight: 1.25,
                                letterSpacing: "-0.02em"
                            }}>
                                Khung giờ tư vấn
                            </Typography>
                            {viewMode === "manage" &&
                            schedulePolicy.academicSemesterLimitActive &&
                            isAcademicCalendarLimitActive(schedulePolicy.academicCalendar) ? (
                                <Chip size="small" label="Theo học kỳ" color="info" variant="outlined"
                                      sx={{fontWeight: 600}}/>
                            ) : null}
                        </Stack>
                        <Typography variant="body2" sx={{color: "#64748b", mt: 0.65, lineHeight: 1.55}}>
                            {isPrimaryBranch && viewMode === "overview"
                                ? "Xem tổng quan lịch tất cả cơ sở (chỉ đọc)."
                                : "Xem danh sách lượt gán hoặc lưới lịch; lọc theo người, thứ, khoảng ngày; hủy gán đúng từng lượt đã tải."}
                        </Typography>
                    </Box>
                </Box>

                {isPrimaryBranch ? (
                    <Box sx={{px: {xs: 2, sm: 3}, pt: 2, pb: 0.5}}>
                        <Tabs
                            value={viewMode}
                            onChange={(_, v) => setViewMode(v)}
                            sx={scheduleTabsSx}
                            TabIndicatorProps={{sx: {height: 3, bgcolor: "#0D64DE"}}}
                        >
                            <Tab value="manage" label="Chỉnh sửa theo cơ sở"/>
                            <Tab value="overview" label="Xem tất cả"/>
                        </Tabs>
                    </Box>
                ) : null}

                {viewMode === "manage" ? (() => {
                    const showSemesterAlert =
                        !schedulePolicy.loading &&
                        !schedulePolicy.error &&
                        schedulePolicy.academicSemesterLimitActive &&
                        isAcademicCalendarLimitActive(schedulePolicy.academicCalendar);
                    if (!schedulePolicy.loading && !schedulePolicy.error && !showSemesterAlert) return null;
                    return (
                        <Box
                            sx={{
                                px: {xs: 2, sm: 3},
                                pt: 2,
                                pb: 1.5,
                                borderBottom: `1px solid ${BORDER_SOFT}`,
                                bgcolor: "rgba(248,250,252,0.9)",
                            }}
                        >
                            {schedulePolicy.loading ? (
                                <Skeleton variant="rounded" height={56} sx={{borderRadius: "10px"}}/>
                            ) : schedulePolicy.error ? (
                                <Typography variant="body2" sx={{color: "#B91C1C"}}>
                                    {schedulePolicy.error}
                                </Typography>
                            ) : (
                                <Alert severity="info" variant="outlined" sx={{borderRadius: 2}}>
                                    <Typography variant="body2" sx={{color: "#334155", lineHeight: 1.55}}>
                                        Gán lịch tư vấn chỉ trong phạm vi học kỳ đã cấu hình:{" "}
                                        {termIsComplete(schedulePolicy.academicCalendar?.term1) ? (
                                            <>
                                                <Box component="span" sx={{fontWeight: 700}}>
                                                    {formatYmdVi(schedulePolicy.academicCalendar.term1.start)} –{" "}
                                                    {formatYmdVi(schedulePolicy.academicCalendar.term1.end)} (HK1)
                                                </Box>
                                            </>
                                        ) : null}
                                        {termIsComplete(schedulePolicy.academicCalendar?.term1) &&
                                        termIsComplete(schedulePolicy.academicCalendar?.term2)
                                            ? " · "
                                            : null}
                                        {termIsComplete(schedulePolicy.academicCalendar?.term2) ? (
                                            <Box component="span" sx={{fontWeight: 700}}>
                                                {formatYmdVi(schedulePolicy.academicCalendar.term2.start)} –{" "}
                                                {formatYmdVi(schedulePolicy.academicCalendar.term2.end)} (HK2)
                                            </Box>
                                        ) : null}
                                    </Typography>
                                </Alert>
                            )}
                        </Box>
                    );
                })() : null}

                {viewMode === "manage" ? (
                    <>
                        <Box sx={{px: {xs: 2, sm: 3}, pt: 2, pb: 2}}>
                            <Stack spacing={1.25}>
                                <Box
                                    sx={{
                                        ...filterSurfaceSx,
                                        p: {xs: 1.5, sm: 1.75},
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: 1.25,
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                    }}
                                >
                                    <Stack direction="row" flexWrap="wrap" alignItems="center" spacing={1.25} useFlexGap>
                                        <ToggleButtonGroup
                                            size="small"
                                            value={managePanel}
                                            exclusive
                                            onChange={(_, v) => {
                                                if (v) setManagePanel(v);
                                            }}
                                            sx={{
                                                bgcolor: SURFACE_CARD,
                                                p: "5px",
                                                borderRadius: "12px",
                                                border: `1px solid ${BORDER_SOFT}`,
                                                gap: 0.5,
                                                "& .MuiToggleButton-root": {
                                                    border: "none",
                                                    borderRadius: "10px !important",
                                                    px: 2,
                                                    py: 0.85,
                                                    fontWeight: 700,
                                                    fontSize: "0.8125rem",
                                                    color: "#64748B",
                                                    textTransform: "none",
                                                    "&.Mui-selected": {
                                                        bgcolor: PRIMARY_SOFT,
                                                        color: PRIMARY,
                                                        "&:hover": {bgcolor: "rgba(13,100,222,0.16)"},
                                                    },
                                                },
                                            }}
                                        >
                                            <ToggleButton value="grid">Lưới lịch</ToggleButton>
                                            <ToggleButton value="list">Danh sách lượt gán</ToggleButton>
                                        </ToggleButtonGroup>
                                        {managePanel === "grid" ? (
                                            <>
                                                <Box
                                                    sx={{
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        bgcolor: SURFACE_CARD,
                                                        borderRadius: "12px",
                                                        border: `1px solid ${BORDER_SOFT}`,
                                                        px: 0.25,
                                                        py: 0.25,
                                                        boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
                                                    }}
                                                >
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => shiftCalendar(-1)}
                                                        aria-label="Trước"
                                                        sx={{color: "#475569", borderRadius: "10px"}}
                                                    >
                                                        <ChevronLeftIcon fontSize="small"/>
                                                    </IconButton>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            minWidth: {xs: 150, sm: 200},
                                                            textAlign: "center",
                                                            fontWeight: 700,
                                                            color: "#0f172a",
                                                            fontSize: "0.8125rem",
                                                            px: 1,
                                                        }}
                                                    >
                                                        {calendarLabelText}
                                                    </Typography>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => shiftCalendar(1)}
                                                        aria-label="Sau"
                                                        sx={{color: "#475569", borderRadius: "10px"}}
                                                    >
                                                        <ChevronRightIcon fontSize="small"/>
                                                    </IconButton>
                                                </Box>
                                            </>
                                        ) : null}
                                    </Stack>
                                </Box>

                                <Box
                                    sx={{
                                        ...filterSurfaceSx,
                                        p: {xs: 1.5, sm: 1.75},
                                    }}
                                >
                                    <Stack direction="row" flexWrap="wrap" spacing={1.25} useFlexGap alignItems="center">
                                        <FormControl size="small" sx={{minWidth: 132, ...outlineSelectSx}} disabled={managePanel === "grid"}>
                                            <InputLabel>Thứ</InputLabel>
                                            <Select
                                                label="Thứ"
                                                value={listFilterDay}
                                                onChange={(e) => setListFilterDay(e.target.value)}
                                            >
                                                <MenuItem value="">Tất cả</MenuItem>
                                                {DAYS.map((d) => (
                                                    <MenuItem key={d} value={d}>
                                                        {DAY_LABELS[d]}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                        <TextField
                                            size="small"
                                            type="date"
                                            label="Từ ngày"
                                            value={listRangeStart}
                                            onChange={(e) => setListRangeStart(e.target.value)}
                                            InputLabelProps={{shrink: true}}
                                            disabled={managePanel === "grid"}
                                            sx={{width: 158, ...outlineSelectSx}}
                                        />
                                        <TextField
                                            size="small"
                                            type="date"
                                            label="Đến ngày"
                                            value={listRangeEnd}
                                            onChange={(e) => setListRangeEnd(e.target.value)}
                                            InputLabelProps={{shrink: true}}
                                            disabled={managePanel === "grid"}
                                            sx={{width: 158, ...outlineSelectSx}}
                                        />
                                        <FormControl
                                            size="small"
                                            sx={{minWidth: 188, ...outlineSelectSx}}
                                            disabled={loadingCampuses || campusRows.length === 0}
                                        >
                                            <InputLabel>Tư vấn viên</InputLabel>
                                            <Select
                                                label="Tư vấn viên"
                                                value={filterCounsellorId === "" ? "" : String(filterCounsellorId)}
                                                onChange={(e) => setFilterCounsellorId(e.target.value === "" ? "" : String(e.target.value))}
                                            >
                                                <MenuItem value="">Tất cả</MenuItem>
                                                {counsellorFilterOptions.map((c) => (
                                                    <MenuItem key={c.id} value={String(c.id)}>
                                                        {assignedCounsellorLabel(c)}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    <FormControl size="small" sx={{minWidth: 168, ...outlineSelectSx}}>
                                        <InputLabel>Loại buổi</InputLabel>
                                        <Select
                                            label="Loại buổi"
                                            value={sessionFilter}
                                            onChange={(e) => setSessionFilter(e.target.value)}
                                        >
                                            <MenuItem value="ALL">Tất cả</MenuItem>
                                            {SESSION_OPTIONS.map((o) => (
                                                <MenuItem key={o} value={o}>
                                                    {sessionTypeLabel(o)}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    </Stack>
                                </Box>
                                {viewMode === "manage" && managePanel === "list" && selectedAssignmentSlotIds.size > 0 ? (
                                    <Box
                                        sx={{
                                            ...filterSurfaceSx,
                                            p: {xs: 1.5, sm: 1.25},
                                            display: "flex",
                                            flexWrap: "wrap",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            gap: 1,
                                        }}
                                    >
                                        <Typography sx={{fontSize: "0.8125rem", fontWeight: 600, color: "#0f172a", mr: 0.5}}>
                                            Đã chọn {selectedAssignmentSlotIds.size} lượt
                                        </Typography>
                                        <Button
                                            variant="outlined"
                                            color="error"
                                            size="small"
                                            disabled={unassignSubmitting}
                                            onClick={() => {
                                                const rows = sortedListViewRows.filter((r) => {
                                                    const sid = getAssignedRowSlotId(r);
                                                    return sid != null && selectedAssignmentSlotIds.has(sid);
                                                });
                                                if (rows.length === 0) return;
                                                setUnassignDialog({open: true, rows});
                                            }}
                                            startIcon={<LinkOffIcon sx={{fontSize: 18}}/>}
                                            sx={{textTransform: "none", fontWeight: 700, borderRadius: "10px"}}
                                        >
                                            Hủy gán đã chọn
                                        </Button>
                                    </Box>
                                ) : null}
                                {viewMode === "manage" && managePanel === "grid" ? (
                                    <Box
                                        sx={{
                                            ...filterSurfaceSx,
                                            p: {xs: 1.5, sm: 1.25},
                                            display: "flex",
                                            flexWrap: "wrap",
                                            alignItems: "center",
                                            justifyContent: "flex-start",
                                            gap: 1,
                                            minHeight: {sm: 62},
                                        }}
                                    >
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    size="small"
                                                    checked={multiSelectMode}
                                                    onChange={(_, c) => setMultiSelectMode(c)}
                                                    sx={{py: 0}}
                                                />
                                            }
                                            label={
                                                <Typography sx={{fontSize: "0.8125rem", fontWeight: 600, color: "#475569"}}>
                                                    Chọn nhiều khung
                                                </Typography>
                                            }
                                        />
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    size="small"
                                                    checked={allGridSlotsSelected}
                                                    indeterminate={partialGridSlotsSelected}
                                                    onChange={onToggleSelectAllGridSlots}
                                                    disabled={selectableGridFrameKeys.length === 0}
                                                    sx={{py: 0}}
                                                />
                                            }
                                            label={
                                                <Typography sx={{fontSize: "0.8125rem", fontWeight: 600, color: "#475569"}}>
                                                    Chọn tất cả
                                                </Typography>
                                            }
                                        />
                                        <Stack
                                            direction="row"
                                            spacing={1}
                                            alignItems="center"
                                            flexWrap="wrap"
                                            useFlexGap
                                            sx={{
                                                ml: {xs: 0, md: "auto"},
                                                minWidth: {xs: "100%", md: "auto"},
                                                justifyContent: {xs: "flex-start", md: "flex-end"},
                                                visibility: multiSelectMode && selectedFrameKeys.size > 0 ? "visible" : "hidden",
                                            }}
                                        >
                                            {multiSelectMode && selectedFrameKeys.size > 0 ? (
                                                <>
                                                    <Button
                                                        variant="contained"
                                                        size="small"
                                                        disabled={submitting}
                                                        onClick={openBatchAssignFromSelection}
                                                        startIcon={<PersonAddAlt1Icon sx={{fontSize: 18}}/>}
                                                        sx={{textTransform: "none", fontWeight: 700, borderRadius: "10px", boxShadow: "none"}}
                                                    >
                                                        Gán {selectedFrameKeys.size} khung
                                                    </Button>
                                                </>
                                            ) : null}
                                        </Stack>
                                    </Box>
                                ) : null}
                            </Stack>
                        </Box>
                    </>
                ) : null}

                <CardContent sx={{
                    p: {xs: 2, sm: 3},
                    pt: viewMode === "manage" ? 1 : {xs: 2, sm: 3},
                    "&:last-child": {pb: {xs: 2.5, sm: 3}}
                }}>
                    {viewMode === "manage" && loadingCampuses ? (
                        <Skeleton variant="rounded" height={320} sx={{borderRadius: 2}}/>
                    ) : null}

                    {viewMode === "manage" && !loadingCampuses && campusRows.length === 0 ? (
                        <Box
                            sx={{
                                py: 6,
                                px: 2,
                                textAlign: "center",
                                borderRadius: RADIUS_INNER,
                                border: `1px dashed ${BORDER_SOFT}`,
                                bgcolor: "rgba(248,250,252,0.85)",
                            }}
                        >
                            <Box
                                sx={{
                                    width: 72,
                                    height: 72,
                                    mx: "auto",
                                    mb: 2,
                                    borderRadius: "18px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    bgcolor: PRIMARY_SOFT,
                                    border: `1px solid rgba(13,100,222,0.12)`,
                                }}
                            >
                                <EventAvailableIcon sx={{fontSize: 40, color: PRIMARY, opacity: 0.85}}/>
                            </Box>
                            <Typography sx={{fontWeight: 700, color: "#334155", fontSize: "1.05rem"}}>Chưa có cơ
                                sở</Typography>
                            <Typography variant="body2"
                                        sx={{color: "#94a3b8", mt: 1, maxWidth: 360, mx: "auto", lineHeight: 1.6}}>
                                Thêm cơ sở trong mục Cấu hình cơ sở trước khi thiết lập lịch.
                            </Typography>
                        </Box>
                    ) : null}

                    {viewMode === "manage" && !loadingCampuses && campusRows.length > 0 ? (
                        loadingSchedule ? (
                            <Box
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns: `repeat(7, ${SCHEDULE_DAY_COLUMN_PX}px)`,
                                    width: "max-content",
                                    maxWidth: "100%",
                                    gap: 1.5,
                                    overflowX: "auto",
                                }}
                            >
                                {DAYS.map((d) => (
                                    <Skeleton key={d} variant="rounded" height={400}
                                              sx={{borderRadius: "12px", width: SCHEDULE_DAY_COLUMN_PX}}/>
                                ))}
                            </Box>
                        ) : managePanel === "list" ? (
                            <>
                                {loadingAssigned ? (
                                    <LinearProgress
                                        sx={{
                                            mb: 2,
                                            borderRadius: 999,
                                            height: 3,
                                            bgcolor: "rgba(13,100,222,0.08)",
                                            "& .MuiLinearProgress-bar": {borderRadius: 999},
                                        }}
                                        color="primary"
                                    />
                                ) : null}
                                <Alert severity="info" variant="outlined" sx={{mb: 2, borderRadius: 2}}>
                                    <Typography variant="body2" sx={{lineHeight: 1.55, color: "#334155"}}>
                                        Mỗi dòng là <strong>một tư vấn viên</strong> trên một khung lịch; hủy gán một
                                        người{" "}
                                        <strong>không</strong> ảnh hưởng người khác cùng khung.
                                    </Typography>
                                </Alert>
                                {assignedSlotRows.length === 0 && !loadingAssigned ? (
                                    <Box
                                        sx={{
                                            py: 6,
                                            px: 2,
                                            textAlign: "center",
                                            borderRadius: RADIUS_INNER,
                                            border: `1px dashed ${BORDER_SOFT}`,
                                            bgcolor: "rgba(248,250,252,0.85)",
                                        }}
                                    >
                                        <PeopleOutlineIcon sx={{fontSize: 48, color: PRIMARY, opacity: 0.75, mb: 1.5}}/>
                                        <Typography sx={{fontWeight: 700, color: "#334155", fontSize: "1.05rem"}}>Chưa
                                            có lượt gán</Typography>
                                        <Typography variant="body2" sx={{
                                            color: "#94a3b8",
                                            mt: 1,
                                            maxWidth: 400,
                                            mx: "auto",
                                            lineHeight: 1.6
                                        }}>
                                            Gán tư vấn viên vào khung giờ trên lưới lịch để lượt gán xuất hiện tại đây.
                                        </Typography>
                                        <Button
                                            variant="contained"
                                            startIcon={<PersonAddAlt1Icon/>}
                                            sx={{
                                                mt: 2.5,
                                                textTransform: "none",
                                                fontWeight: 700,
                                                borderRadius: "10px",
                                                boxShadow: "none"
                                            }}
                                            onClick={() => setManagePanel("grid")}
                                        >
                                            Gán lịch
                                        </Button>
                                    </Box>
                                ) : sortedListViewRows.length === 0 && !loadingAssigned ? (
                                    <Box sx={{py: 4, textAlign: "center"}}>
                                        <Typography variant="body2" sx={{color: "#64748B", mb: 2}}>
                                            Không có dòng phù hợp bộ lọc hiện tại.
                                        </Typography>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            sx={{textTransform: "none", fontWeight: 600, borderRadius: "10px"}}
                                            onClick={() => {
                                                setListFilterDay("");
                                                setListRangeStart("");
                                                setListRangeEnd("");
                                                setSessionFilter("ALL");
                                                setFilterCounsellorId("");
                                            }}
                                        >
                                            Đặt lại bộ lọc
                                        </Button>
                                    </Box>
                                ) : (
                                    <TableContainer
                                        component={Paper}
                                        elevation={0}
                                        sx={{
                                            borderRadius: RADIUS_INNER,
                                            border: `1px solid ${BORDER_SOFT}`,
                                            overflow: "auto",
                                        }}
                                    >
                                        <Table size="small" stickyHeader>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell padding="checkbox"
                                                               sx={{bgcolor: "rgba(248,250,252,0.95)"}}>
                                                        {(() => {
                                                            const allListIds = sortedListViewRows
                                                                .map((r) => getAssignedRowSlotId(r))
                                                                .filter((id) => id != null);
                                                            const allSelected =
                                                                allListIds.length > 0 && allListIds.every((id) => selectedAssignmentSlotIds.has(id));
                                                            const someSelected = allListIds.some((id) => selectedAssignmentSlotIds.has(id));
                                                            return (
                                                                <Checkbox
                                                                    size="small"
                                                                    indeterminate={someSelected && !allSelected}
                                                                    checked={allSelected}
                                                                    disabled={unassignSubmitting || allListIds.length === 0}
                                                                    onChange={() => {
                                                                        if (allSelected) {
                                                                            setSelectedAssignmentSlotIds(new Set());
                                                                        } else {
                                                                            setSelectedAssignmentSlotIds(new Set(allListIds));
                                                                        }
                                                                    }}
                                                                    inputProps={{"aria-label": "Chọn tất cả lượt gán"}}
                                                                />
                                                            );
                                                        })()}
                                                    </TableCell>
                                                    <TableCell sx={{
                                                        fontWeight: 700,
                                                        bgcolor: "rgba(248,250,252,0.95)"
                                                    }}>Khung</TableCell>
                                                    <TableCell
                                                        sx={{fontWeight: 700, bgcolor: "rgba(248,250,252,0.95)"}}>Từ –
                                                        Đến</TableCell>
                                                    <TableCell
                                                        sx={{fontWeight: 700, bgcolor: "rgba(248,250,252,0.95)"}}>Tư vấn
                                                        viên</TableCell>
                                                    <TableCell align="right" sx={{
                                                        fontWeight: 700,
                                                        bgcolor: "rgba(248,250,252,0.95)",
                                                        width: 72
                                                    }}>
                                                        Hủy gán
                                                    </TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {sortedListViewRows.map((row, idx) => {
                                                    const sid = getAssignedRowSlotId(row);
                                                    const blockedByData = assignmentRowBlocksUnassign(row);
                                                    const blockedByResponse = sid != null && blockedUnassignSlotIds.has(sid);
                                                    const blocked = blockedByData || blockedByResponse;
                                                    const c = row?.counsellor ?? {id: row?.counsellor_id};
                                                    const email = c?.email != null && String(c.email).trim() !== "" ? String(c.email).trim() : "";
                                                    const rowDisabled = sid == null || unassignSubmitting;
                                                    return (
                                                        <TableRow key={sid != null ? `slot-${sid}` : `row-${idx}`}
                                                                  hover>
                                                            <TableCell padding="checkbox">
                                                                <Checkbox
                                                                    size="small"
                                                                    disabled={rowDisabled || sid == null}
                                                                    checked={sid != null && selectedAssignmentSlotIds.has(sid)}
                                                                    onChange={() => {
                                                                        if (sid == null) return;
                                                                        setSelectedAssignmentSlotIds((prev) => {
                                                                            const next = new Set(prev);
                                                                            if (next.has(sid)) next.delete(sid);
                                                                            else next.add(sid);
                                                                            return next;
                                                                        });
                                                                    }}
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Typography variant="body2"
                                                                            sx={{fontWeight: 600, color: "#0f172a"}}>
                                                                    {formatAssignedRowSlotLabel(row)}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Typography variant="body2" sx={{color: "#334155"}}>
                                                                    {formatYmdVi(row?.startDate)} → {formatYmdVi(row?.endDate)}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Typography variant="body2" sx={{fontWeight: 600}}>
                                                                    {assignedCounsellorLabel(c)}
                                                                </Typography>
                                                                {email ? (
                                                                    <Typography variant="caption" sx={{
                                                                        color: "#64748B",
                                                                        display: "block"
                                                                    }}>
                                                                        {email}
                                                                    </Typography>
                                                                ) : null}
                                                            </TableCell>
                                                            <TableCell align="right">
                                                                <Tooltip
                                                                    title={blocked ? "Có lịch hẹn đang chờ — không thể gỡ" : "Hủy gán"}>
                                  <span>
                                    <IconButton
                                        size="small"
                                        aria-label="Hủy gán"
                                        disabled={rowDisabled || blocked}
                                        onClick={() => setUnassignDialog({open: true, rows: [row]})}
                                        sx={{color: blocked ? "action.disabled" : "error.main"}}
                                    >
                                      <LinkOffIcon fontSize="small"/>
                                    </IconButton>
                                  </span>
                                                                </Tooltip>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                )}
                            </>
                        ) : (
                            <>
                                {loadingAssigned ? (
                                    <LinearProgress
                                        sx={{
                                            mb: 2,
                                            borderRadius: 999,
                                            height: 3,
                                            bgcolor: "rgba(13,100,222,0.08)",
                                            "& .MuiLinearProgress-bar": {borderRadius: 999},
                                        }}
                                        color="primary"
                                    />
                                ) : null}
                                {assignedOutOfViewHint ? (
                                    <Alert severity="warning" variant="outlined" sx={{mb: 2, borderRadius: 2}}>
                                        <Typography variant="body2" sx={{lineHeight: 1.55, color: "#334155"}}>
                                            Đã tải {assignedRowsFilteredByCounsellor.length} lượt gán
                                            {filterCounsellorId !== "" ? " (sau lọc tư vấn viên)" : ""} từ máy chủ
                                            nhưng{" "}
                                            <strong>không có ngày nào
                                                trong {calendarGranularity === "week" ? "tuần" : "tháng"} đang
                                                xem</strong> nằm
                                            trong khoảng hiệu lực của các gán đó
                                            {assignedOutOfViewHint.kind === "range" && assignedOutOfViewHint.label
                                                ? ` (${assignedOutOfViewHint.label})`
                                                : ""}
                                            . Dùng nút chuyển tuần/tháng để tới khoảng thời gian đó — chip tư vấn viên
                                            chỉ hiện khi lịch và khoảng
                                            gán giao nhau.
                                        </Typography>
                                    </Alert>
                                ) : null}
                                {renderWeeklyGrid(scheduleByDay, {
                                    readOnly: false,
                                    applySessionFilter: true,
                                    counsellor: counsellorGridApi,
                                    columnHeaderDates,
                                })}
                            </>
                        )
                    ) : null}

                    {viewMode === "overview" ? (
                        <>
                            {loadingOverview ? (
                                <Stack spacing={1}>
                                    <Skeleton variant="rounded" height={48}/>
                                    <Skeleton variant="rounded" height={200}/>
                                </Stack>
                            ) : overviewRows.length === 0 ? (
                                <Typography sx={{color: "#64748b"}}>Không có dữ liệu.</Typography>
                            ) : (
                                <>
                                    {overviewRows.map((row, i) => (
                                        <Accordion
                                            key={row.campusId ?? i}
                                            disableGutters
                                            elevation={0}
                                            sx={{
                                                border: "1px solid #e2e8f0",
                                                borderRadius: "10px !important",
                                                mb: 1,
                                                "&:before": {display: "none"},
                                                overflow: "hidden",
                                            }}
                                        >
                                            <AccordionSummary expandIcon={<ExpandMoreIcon/>}>
                                                <Typography sx={{fontWeight: 600, color: "#334155"}}>
                                                    {row.campusName || `Cơ sở #${row.campusId}`}
                                                </Typography>
                                            </AccordionSummary>
                                            <AccordionDetails sx={{bgcolor: PAGE_BG, pt: 2}}>
                                                {renderWeeklyGrid(row.scheduleByDay || {}, {
                                                    readOnly: true,
                                                    campusLabel: row.campusName || `Cơ sở #${row.campusId}`,
                                                    applySessionFilter: false,
                                                    counsellor: null,
                                                    columnHeaderDates,
                                                })}
                                            </AccordionDetails>
                                        </Accordion>
                                    ))}
                                </>
                            )}
                        </>
                    ) : null}
                </CardContent>
            </Card>

            <Dialog
                open={dialogOpen}
                onClose={(event, reason) => {
                    if (reason === "backdropClick") return;
                    if (!submitting) setDialogOpen(false);
                }}
                fullWidth
                maxWidth="md"
                PaperProps={{sx: {borderRadius: "12px"}}}
            >
                <DialogTitle sx={{display: "flex", alignItems: "center", justifyContent: "space-between", pr: 1}}>
                    <Typography variant="h6" sx={{fontWeight: 700}}>
                        {form.templateId ? "Sửa khung giờ" : "Thêm khung giờ mới"}
                    </Typography>
                    <IconButton onClick={() => setDialogOpen(false)} disabled={submitting} size="small"
                                aria-label="Đóng">
                        <CloseIcon/>
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{bgcolor: PAGE_BG}}>
                    <Alert severity="info" sx={{mb: 2, borderRadius: 2, "& .MuiAlert-message": {width: "100%"}}}>
                        <Typography variant="subtitle2" sx={{fontWeight: 700, mb: 1, color: "#0f172a"}}>
                            Cách tạo nhanh
                        </Typography>
                        <Box component="ol"
                             sx={{m: 0, pl: 2.25, color: "#334155", fontSize: "0.875rem", lineHeight: 1.65}}>
                            <Typography component="li" variant="body2" sx={{mb: 0.75}}>
                                Chọn <strong>ngày</strong> trong tuần (có thể chọn nhiều ngày).
                            </Typography>
                            <Typography component="li" variant="body2" sx={{mb: 0.75}}>
                                Chọn <strong>buổi</strong>: sáng, chiều hoặc tối.
                            </Typography>
                            <Typography component="li" variant="body2" sx={{mb: 0.75}}>
                                Xem ô bên dưới để biết <strong>khung giờ</strong> tương ứng — giờ này theo lịch làm việc
                                trường đã thiết lập,{" "}
                                <strong>không cần nhập giờ tay</strong>.
                            </Typography>
                        </Box>
                        <Typography variant="body2" sx={{mt: 1.25, color: "#475569", lineHeight: 1.55}}>
                            Thời lượng <strong>mỗi cuộc tư vấn</strong> (một “slot”) do trường quy định — xem dòng{" "}
                            <strong>Độ dài slot</strong> trong phần thông tin cơ sở phía trên trang.
                        </Typography>
                    </Alert>
                    <Stack direction={{xs: "column", md: "row"}} spacing={3} sx={{pt: 0}}>
                        <Box sx={{flex: 1, minWidth: 0}}>
                            <Typography variant="subtitle2" sx={{fontWeight: 700, mb: 1.5, color: "#374151"}}>
                                Buổi và xem trước giờ
                            </Typography>
                            <Stack spacing={2}>
                                <FormControl fullWidth error={!!formErrors.session}>
                                    <InputLabel>Loại buổi</InputLabel>
                                    <Select
                                        label="Loại buổi"
                                        value={String(form.sessionType || "MORNING").toUpperCase()}
                                        onChange={(e) => {
                                            setForm((p) => ({...p, sessionType: e.target.value}));
                                            setFormErrors((er) => ({...er, overlap: undefined, session: undefined}));
                                        }}
                                    >
                                        {(() => {
                                            const u = String(form.sessionType || "").toUpperCase();
                                            const opts = [...SESSION_OPTIONS];
                                            if (u && !opts.includes(u)) opts.push(u);
                                            return opts.map((o) => (
                                                <MenuItem key={o} value={o}>
                                                    {sessionTypeLabel(o)}
                                                </MenuItem>
                                            ));
                                        })()}
                                    </Select>
                                </FormControl>
                                {sessionWindowPreview ? (
                                    <Box
                                        sx={{
                                            p: 1.5,
                                            borderRadius: 1.5,
                                            bgcolor: "rgba(13, 100, 222, 0.06)",
                                            border: "1px solid rgba(13, 100, 222, 0.22)",
                                        }}
                                    >
                                        <Typography variant="caption"
                                                    sx={{fontWeight: 700, color: "#334155", display: "block", mb: 0.5}}>
                                            Khung giờ dự kiến
                                        </Typography>
                                        <Typography variant="body1" sx={{color: "#0f172a", fontWeight: 700}}>
                                            {sessionWindowPreview.start} – {sessionWindowPreview.end}
                                        </Typography>
                                        <Typography variant="caption" sx={{
                                            color: "#64748b",
                                            display: "block",
                                            mt: 0.75,
                                            lineHeight: 1.5
                                        }}>
                                            Trùng với giờ làm việc / ca mà trường đã cấu hình. Nếu lưu báo lỗi, vui lòng
                                            kiểm tra lại phần lịch làm
                                            việc tại <strong>Cấu hình vận hành</strong> (trụ sở).
                                        </Typography>
                                    </Box>
                                ) : (
                                    <Typography variant="caption"
                                                sx={{color: "#B45309", display: "block", lineHeight: 1.5}}>
                                        Chưa tìm thấy giờ cho buổi này trong dữ liệu đã tải. Nhờ trụ sở kiểm tra
                                        mục <strong>Giờ làm việc và ca</strong>{" "}
                                        trong <strong>Cấu hình vận hành</strong>.
                                    </Typography>
                                )}
                                {formErrors.session ? (
                                    <Typography variant="caption" color="error" sx={{display: "block"}}>
                                        {formErrors.session}
                                    </Typography>
                                ) : null}
                                {formErrors.overlap ? (
                                    <Typography variant="caption" sx={{color: "#DC2626", display: "block"}}>
                                        {formErrors.overlap}
                                    </Typography>
                                ) : null}
                                {!isEditing && schedulePolicy.slotDurationMinutes > 0 ? (
                                    <Box>
                                        <Typography variant="caption" sx={{color: "#64748B", display: "block", mb: 1}}>
                                            Nhắc trước khi tách: đang dùng
                                            tiết {schedulePolicy.slotDurationMinutes} phút
                                            {schedulePolicy.bufferBetweenSlotsMinutes > 0
                                                ? ` + nghỉ ${schedulePolicy.bufferBetweenSlotsMinutes} phút giữa hai tiết`
                                                : " — không nghỉ giữa tiết"}
                                            .
                                        </Typography>
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={Boolean(form.expandToPolicySlots)}
                                                    onChange={(e) => {
                                                        const v = e.target.checked;
                                                        setForm((p) => ({...p, expandToPolicySlots: v}));
                                                        setFormErrors((er) => ({...er, expandSlots: undefined}));
                                                    }}
                                                    size="small"
                                                />
                                            }
                                            label={
                                                <Box component="span">
                                                    <Typography variant="body2" sx={{
                                                        fontWeight: 600,
                                                        color: "#374151",
                                                        display: "block"
                                                    }}>
                                                        Chia nhỏ thành nhiều lịch hẹn
                                                    </Typography>
                                                    <Typography variant="caption"
                                                                sx={{color: "#6B7280", display: "block", mt: 0.25}}>
                                                        Mỗi đoạn là một tiết tư vấn (đúng thời lượng ở mục <strong>Độ
                                                        dài slot</strong>); nếu trường có cấu hình
                                                        nghỉ giữa tiết, hệ thống sẽ tính khoảng trống đó giữa hai lịch
                                                        liên tiếp. Dùng khi muốn nhiều khung liên
                                                        tiếp trong cùng buổi. Chỉ khi <strong>thêm mới</strong>.
                                                    </Typography>
                                                </Box>
                                            }
                                        />
                                        {form.expandToPolicySlots ? (
                                            <Box sx={{pl: 4, pt: 0.5}}>
                                                {formErrors.expandSlots ? (
                                                    <Typography variant="caption" color="error"
                                                                sx={{display: "block", mb: 0.5}}>
                                                        {formErrors.expandSlots}
                                                    </Typography>
                                                ) : null}
                                                {slotSplitPreview.count > 0 ? (
                                                    <Typography variant="caption" sx={{
                                                        color: "#0f766e",
                                                        fontWeight: 600,
                                                        display: "block"
                                                    }}>
                                                        Dự kiến {slotSplitPreview.count} khung
                                                        hẹn: {slotSplitPreview.labels.join(", ")}
                                                        {slotSplitPreview.count > slotSplitPreview.labels.length ? " …" : ""}
                                                    </Typography>
                                                ) : form.expandToPolicySlots && !formErrors.expandSlots ? (
                                                    <Typography variant="caption" sx={{color: "#94A3B8"}}>
                                                        Tổng thời gian trong khung phải vừa khít với chuỗi tiết + nghỉ
                                                        giữa tiết (theo mục Độ dài slot phía
                                                        trên).
                                                    </Typography>
                                                ) : null}
                                            </Box>
                                        ) : null}
                                    </Box>
                                ) : !isEditing ? (
                                    <Typography variant="caption"
                                                sx={{color: "#64748b", display: "block", lineHeight: 1.5}}>
                                        Chưa có <strong>Độ dài slot</strong> trong cấu hình — không thể chia nhỏ lịch.
                                        Cần trụ sở cấu hình trước
                                        (mục độ dài mỗi cuộc hẹn tư vấn).
                                    </Typography>
                                ) : null}
                            </Stack>
                        </Box>

                        <Box sx={{flex: 1, minWidth: 0}}>
                            <Typography variant="subtitle2" sx={{fontWeight: 700, mb: 1, color: "#374151"}}>
                                {isEditing ? "Ngày áp dụng (một bản ghi)" : "Chọn ngày trong tuần"}
                            </Typography>
                            {!isEditing ? (
                                <Stack direction="row" spacing={1} sx={{mb: 1.5}} flexWrap="wrap" useFlexGap>
                                    <Button size="small" variant="outlined" onClick={selectWeekdays}
                                            sx={{textTransform: "none", borderRadius: "8px"}}>
                                        Trong tuần (T2–T6)
                                    </Button>
                                    <Button size="small" variant="outlined" onClick={selectWeekend}
                                            sx={{textTransform: "none", borderRadius: "8px"}}>
                                        Cuối tuần
                                    </Button>
                                </Stack>
                            ) : null}
                            <Box
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(7, 1fr)",
                                    gap: 1,
                                }}
                            >
                                {DAYS.map((d) => {
                                    const selected = form.dayOfWeek.includes(d);
                                    const dayClosed = !isEditing && openDaySet.size > 0 && !openDaySet.has(d);
                                    return (
                                        <Button
                                            key={d}
                                            onClick={() => toggleDay(d)}
                                            disabled={dayClosed}
                                            variant={selected ? "contained" : "outlined"}
                                            sx={{
                                                minWidth: 0,
                                                px: 0.5,
                                                py: 1,
                                                fontSize: "0.7rem",
                                                fontWeight: 700,
                                                borderRadius: "10px",
                                                textTransform: "none",
                                                ...(selected
                                                    ? {bgcolor: PRIMARY, "&:hover": {bgcolor: "#0a52bd"}}
                                                    : {borderColor: "#E5E7EB", color: "#6B7280"}),
                                            }}
                                        >
                                            {DAY_SHORT[d]}
                                        </Button>
                                    );
                                })}
                            </Box>
                            {formErrors.dayOfWeek ? (
                                <Typography variant="caption" color="error" sx={{mt: 1, display: "block"}}>
                                    {formErrors.dayOfWeek}
                                </Typography>
                            ) : null}
                            {!isEditing ? (
                                <Typography variant="caption" sx={{color: "#6B7280", mt: 1.5, display: "block"}}>
                                    Có thể chọn nhiều ngày cùng lúc. Mỗi ngày sẽ có một lịch giống nhau cho buổi đã
                                    chọn. Nếu bật{" "}
                                    <strong>Chia nhỏ thành nhiều lịch hẹn</strong>, mỗi ngày sẽ có nhiều khung liên tiếp
                                    theo thời lượng mỗi
                                    cuộc hẹn.
                                </Typography>
                            ) : (
                                <Typography variant="caption" sx={{color: "#6B7280", mt: 1.5, display: "block"}}>
                                    Đang sửa một template: chỉ một thứ trong tuần (đổi ngày bằng cách chọn ô khác).
                                </Typography>
                            )}
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{px: 3, py: 2, bgcolor: "#fff", borderTop: "1px solid #E5E7EB"}}>
                    <Button onClick={() => setDialogOpen(false)} disabled={submitting}
                            sx={{textTransform: "none", color: "#6B7280"}}>
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={submitting}
                        sx={{
                            textTransform: "none",
                            fontWeight: 600,
                            borderRadius: "10px",
                            bgcolor: PRIMARY,
                            boxShadow: "none",
                            "&:hover": {bgcolor: "#0a52bd", boxShadow: "none"},
                        }}
                    >
                        Lưu
                    </Button>
                </DialogActions>
            </Dialog>

            <Menu
                id="slot-actions-menu"
                anchorEl={slotActionsMenu.anchorEl}
                open={Boolean(slotActionsMenu.anchorEl)}
                onClose={closeSlotActionsMenu}
                onClick={(e) => e.stopPropagation()}
                anchorOrigin={{vertical: "bottom", horizontal: "right"}}
                transformOrigin={{vertical: "top", horizontal: "right"}}
                slotProps={{
                    paper: {
                        sx: {
                            borderRadius: "12px",
                            minWidth: 228,
                            mt: 0.5,
                            py: 0.25,
                            boxShadow: SHADOW_MD,
                            border: `1px solid ${BORDER_SOFT}`,
                        },
                    },
                }}
            >
                {/* Gán: POST counsellor/assign ASSIGN. Sửa khung: template API. */}
                <MenuItem
                    onClick={() => {
                        const {slot: s, day: d} = slotActionsMenu;
                        closeSlotActionsMenu();
                        if (s && d) setScheduleDetail({open: true, slot: s, day: d});
                    }}
                    sx={{py: 1.1, borderRadius: "10px", mx: 0.5, mt: 0.5}}
                >
                    <ListItemIcon sx={{minWidth: 38}}>
                        <PeopleOutlineIcon fontSize="small" sx={{color: PRIMARY}}/>
                    </ListItemIcon>
                    <ListItemText
                        primary="Chi tiết khung & lượt gán"
                        secondary={
                            slotMenuAssignCount > 0
                                ? `${slotMenuAssignCount} lượt · mở để gán thêm hoặc xem chi tiết`
                                : "Chưa có gán — mở để gán hoặc kiểm tra"
                        }
                        primaryTypographyProps={{fontWeight: 600, fontSize: "0.875rem"}}
                        secondaryTypographyProps={{variant: "caption", sx: {color: "#64748B"}}}
                    />
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        const {slot: s, day: d} = slotActionsMenu;
                        closeSlotActionsMenu();
                        if (s && d) openEdit(s, d);
                    }}
                    sx={{py: 1.1, borderRadius: "10px", mx: 0.5}}
                >
                    <ListItemIcon sx={{minWidth: 38}}>
                        <EditOutlinedIcon fontSize="small" sx={{color: "#475569"}}/>
                    </ListItemIcon>
                    <ListItemText
                        primary="Sửa khung giờ (template)"
                        secondary="Khác API gán tư vấn viên"
                        primaryTypographyProps={{fontWeight: 600, fontSize: "0.875rem"}}
                        secondaryTypographyProps={{variant: "caption", sx: {color: "#94A3B8"}}}
                    />
                </MenuItem>
            </Menu>

            <ScheduleSlotDetailModal
                open={scheduleDetail.open}
                onClose={() => setScheduleDetail({open: false, slot: null, day: null})}
                slot={scheduleDetail.slot}
                dayLabel={scheduleDetail.day ? DAY_LABELS[scheduleDetail.day] : "—"}
                sessionLabel={sessionTypeLabel(scheduleDetail.slot?.sessionType)}
                campusName={displayCampusConfigName(activeCampus?.campusName ?? activeCampus?.campus_name, activeCampusIndex)}
                assigns={scheduleDetailAssigns}
                slotActive={scheduleDetail.slot ? slotIsActive(scheduleDetail.slot) : true}
                onAssign={() => {
                    const {slot, day} = scheduleDetail;
                    if (slot && day && counsellorGridApi) counsellorGridApi.onAssign(slot, day);
                }}
                onEdit={() => {
                    const {slot, day} = scheduleDetail;
                    setScheduleDetail({open: false, slot: null, day: null});
                    if (slot && day) openEdit(slot, day);
                }}
            />

            <Dialog
                open={unassignDialog.open}
                onClose={(_, reason) => {
                    if (reason === "backdropClick") return;
                    if (!unassignSubmitting) setUnassignDialog({open: false, rows: []});
                }}
                fullWidth
                maxWidth="sm"
                PaperProps={{sx: {borderRadius: "16px"}}}
            >
                <DialogTitle sx={{fontWeight: 700}}>Gỡ tư vấn viên?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{color: "#4B5563", mb: 1.5}}>
                        Bạn có chắc muốn <ConfirmHighlight>gỡ</ConfirmHighlight>{" "}
                        <ConfirmHighlight>
                            {unassignDialog.rows?.[0]
                                ? assignedCounsellorLabel(unassignDialog.rows[0]?.counsellor ?? {id: unassignDialog.rows[0]?.counsellor_id})
                                : ""}
                        </ConfirmHighlight>{" "}
                        khỏi khung giờ này trong khoảng:
                    </Typography>
                    <Stack spacing={1} sx={{maxHeight: 280, overflow: "auto"}}>
                        {unassignDialog.rows.map((row, i) => (
                            <Box
                                key={getAssignedRowSlotId(row) != null ? `c-${getAssignedRowSlotId(row)}` : `i-${i}`}
                                sx={{
                                    p: 1.25,
                                    borderRadius: "10px",
                                    border: `1px solid ${BORDER_SOFT}`,
                                    bgcolor: "rgba(248,250,252,0.9)",
                                }}
                            >
                                <Typography variant="body2" sx={{fontWeight: 700, color: "#0f172a"}}>
                                    {formatAssignedRowSlotLabel(row)}
                                </Typography>
                                <Typography variant="caption" sx={{color: "#64748B", display: "block"}}>
                                    {formatYmdVi(row?.startDate)} → {formatYmdVi(row?.endDate)} ·{" "}
                                    {assignedCounsellorLabel(row?.counsellor ?? {id: row?.counsellor_id})}
                                </Typography>
                            </Box>
                        ))}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{px: 3, py: 2, gap: 1}}>
                    <Button
                        onClick={() => setUnassignDialog({open: false, rows: []})}
                        disabled={unassignSubmitting}
                        sx={{textTransform: "none", color: "#64748B"}}
                    >
                        Đóng
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        disabled={unassignSubmitting || unassignDialog.rows.length === 0}
                        onClick={() => runUnassignRows(unassignDialog.rows)}
                        sx={{
                            textTransform: "none",
                            fontWeight: 700,
                            borderRadius: "10px",
                            boxShadow: "none",
                            minWidth: 168
                        }}
                    >
                        {unassignSubmitting ? <CircularProgress size={22} color="inherit"/> : "Xác nhận hủy gán"}
                    </Button>
                </DialogActions>
            </Dialog>

            <CounsellorAssignModal
                open={counsellorModal.open}
                onClose={() =>
                    setCounsellorModal({
                        open: false,
                        slot: null,
                        day: null,
                        batchSlots: null,
                    })
                }
                campusId={activeCampusId}
                templateId={counsellorModal.slot?.id ?? counsellorModal.slot?.templateId}
                dayOfWeekKey={counsellorModal.day ?? null}
                dayOfWeek={counsellorModal.day ? DAY_LABELS[counsellorModal.day] : "—"}
                startTime={counsellorModal.slot?.startTime ?? ""}
                endTime={counsellorModal.slot?.endTime ?? ""}
                sessionTypeLabelText={sessionTypeLabel(counsellorModal.slot?.sessionType)}
                defaultStartDate={viewStartStr}
                defaultEndDate={viewEndStr}
                minCounsellorsPerSlot={schedulePolicy.minCounsellorsPerSlot ?? 1}
                maxCounsellorsPerSlot={schedulePolicy.maxCounsellorsPerSlot ?? 0}
                maxBookingPerSlot={schedulePolicy.maxBookingPerSlot ?? 1}
                academicCalendar={schedulePolicy.academicCalendar}
                academicSemesterLimitActive={schedulePolicy.academicSemesterLimitActive}
                batchSlots={counsellorModal.batchSlots}
                onSuccess={async (snapshot) => {
                    if (snapshot?.slots && Array.isArray(snapshot.slots)) {
                        setAssignedSlotRows(snapshot.slots);
                    } else {
                        await loadAssignedSlots();
                    }
                    setSelectedFrameKeys(new Set());
                }}
            />
        </Box>
    );
}
