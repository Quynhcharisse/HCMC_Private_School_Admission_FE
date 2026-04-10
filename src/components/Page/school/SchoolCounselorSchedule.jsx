import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
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
  InputLabel,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Select,
  LinearProgress,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import { enqueueSnackbar } from "notistack";
import {
  getCampusScheduleTemplateList,
  fetchSchoolCampusScheduleTemplateListAll,
  getSchoolCampusScheduleTemplateList,
  normalizeScheduleTemplateDayMap,
  parseCampusScheduleTemplateListBody,
  parseSchoolCampusScheduleTemplateListBody,
  upsertCampusScheduleTemplate,
} from "../../../services/CampusScheduleTemplateService.jsx";
import {
  getSchoolCampusConfigList,
  parseSchoolCampusConfigListBody,
} from "../../../services/SchoolFacilityService.jsx";
import { useSchool } from "../../../contexts/SchoolContext.jsx";
import CounsellorAssignModal from "./CounsellorAssignModal.jsx";
import ScheduleSlotDetailModal from "./ScheduleSlotDetailModal.jsx";
import {
  getCounsellorAssignedSlots,
  getCounsellorAvailableList,
  parseCounsellorAssignedSlotsBody,
  parseCounsellorAvailableListBody,
  postCounsellorAssign,
} from "../../../services/CampusCounsellorScheduleService.jsx";

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
  "& .MuiTabs-flexContainer": { gap: 0.5 },
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

function timeToMinutes(t) {
  const [h, m] = String(t || "0:0").split(":").map((x) => parseInt(x, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
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
  const wantJs = { MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6, SUN: 0 }[dayKey];
  const lastDay = new Date(y, m + 1, 0).getDate();
  for (let dom = 1; dom <= lastDay; dom++) {
    const t = new Date(y, m, dom);
    if (t.getDay() === wantJs) return t;
  }
  return new Date(y, m, 1);
}

function formatColumnHeaderDate(d) {
  if (!d || !(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
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
  const o = { day: "2-digit", month: "2-digit", year: "numeric" };
  return `${d0.toLocaleDateString("vi-VN", o)} – ${d1.toLocaleDateString("vi-VN", o)}`;
}

function assignedCounsellorLabel(c) {
  if (!c || typeof c !== "object") return "—";
  const n = c.name != null && String(c.name).trim() !== "" ? String(c.name).trim() : "";
  if (n) return n;
  return c.email ? String(c.email) : `ID ${c.id ?? "—"}`;
}

function mapUnassignErrorMessage(raw) {
  const m = String(raw || "").toLowerCase();
  if (
    /book|booking|appointment|reserved|student|học sinh|đặt lịch|lịch hẹn/.test(m)
  ) {
    return "Không thể gỡ do đã có lịch hẹn khách hàng.";
  }
  return raw || "Không thể gỡ gán.";
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
    return { bg: "rgba(254, 243, 199, 0.42)", border: "rgba(245, 158, 11, 0.24)" };
  }
  if (v === "AFTERNOON") {
    return { bg: "rgba(219, 234, 254, 0.48)", border: "rgba(59, 130, 246, 0.22)" };
  }
  if (v === "EVENING") {
    return { bg: "rgba(237, 233, 254, 0.52)", border: "rgba(139, 92, 246, 0.22)" };
  }
  return { bg: "rgba(248, 250, 252, 0.95)", border: BORDER_SOFT };
}

function groupSlotsBySession(slots) {
  const out = { MORNING: [], AFTERNOON: [], EVENING: [] };
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

function findRelatedSlots(slot, scheduleByDay) {
  const st = String(slot?.sessionType || "").toUpperCase();
  const { startTime, endTime } = slot || {};
  const out = [];
  for (const d of DAYS) {
    for (const s of scheduleByDay[d] || []) {
      if (!slotIsActive(s)) continue;
      if (
        s.startTime === startTime &&
        s.endTime === endTime &&
        String(s.sessionType || "").toUpperCase() === st
      ) {
        out.push({ slot: s, day: d });
      }
    }
  }
  return out;
}

const emptyForm = () => ({
  templateId: 0,
  dayOfWeek: [],
  startTime: "08:00",
  endTime: "10:00",
  sessionType: "MORNING",
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
  const { isPrimaryBranch, loading: schoolCtxLoading, currentCampusId } = useSchool();
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

  const [deleteDialog, setDeleteDialog] = useState({ open: false, slot: null, day: null });

  const [calendarGranularity, setCalendarGranularity] = useState("week");
  const [calendarAnchorDate, setCalendarAnchorDate] = useState(() => new Date());
  const [filterCounsellorId, setFilterCounsellorId] = useState("");
  const [counsellorFilterOptions, setCounsellorFilterOptions] = useState([]);
  const [assignedSlotRows, setAssignedSlotRows] = useState([]);
  const [loadingAssigned, setLoadingAssigned] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignSlotCtx, setAssignSlotCtx] = useState({ slot: null, day: null });
  const [unassignDialog, setUnassignDialog] = useState({ open: false, row: null });
  const [unassignSubmitting, setUnassignSubmitting] = useState(false);

  /** Modal chi tiết khung giờ + danh sách tư vấn viên */
  const [scheduleDetail, setScheduleDetail] = useState({ open: false, slot: null, day: null });

  /** Một menu ⋮ cho mỗi thẻ khung giờ (thay 3 nút riêng) */
  const [slotActionsMenu, setSlotActionsMenu] = useState({ anchorEl: null, slot: null, day: null });

  const closeSlotActionsMenu = useCallback(() => {
    setSlotActionsMenu({ anchorEl: null, slot: null, day: null });
  }, []);

  const loadCampuses = useCallback(async () => {
    setLoadingCampuses(true);
    try {
      const schoolListPromise = isPrimaryBranch
        ? getSchoolCampusScheduleTemplateList({ page: 0, pageSize: 200 }).catch(() => null)
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
      const rows = await fetchSchoolCampusScheduleTemplateListAll({ pageSize: 200 });
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

  const { viewStartStr, viewEndStr, calendarLabelText } = useMemo(() => {
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
      calendarLabelText: s.toLocaleDateString("vi-VN", { month: "long", year: "numeric" }),
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
      const res = await getCounsellorAssignedSlots(
        activeCampusId,
        filterCounsellorId === "" ? undefined : filterCounsellorId
      );
      if (res?.status !== 200) {
        throw new Error(res?.data?.message || "Không tải được lịch gán");
      }
      setAssignedSlotRows(parseCounsellorAssignedSlotsBody(res));
    } catch (e) {
      console.error(e);
      enqueueSnackbar(e?.response?.data?.message || e?.message || "Không tải được lịch gán tư vấn viên.", {
        variant: "error",
      });
      setAssignedSlotRows([]);
    } finally {
      setLoadingAssigned(false);
    }
  }, [activeCampusId, viewMode, filterCounsellorId]);

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

  const visibleAssignedRows = useMemo(() => {
    return assignedSlotRows.filter((row) =>
      dateRangesOverlapYMD(row.startDate, row.endDate, viewStartStr, viewEndStr)
    );
  }, [assignedSlotRows, viewStartStr, viewEndStr]);

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

  const counsellorGridApi = useMemo(() => {
    if (viewMode !== "manage") return null;
    return {
      map: assignmentMap,
      onAssign: (slot, day) => {
        setAssignSlotCtx({ slot, day });
        setAssignModalOpen(true);
      },
      onRequestUnassign: (row) => setUnassignDialog({ open: true, row }),
    };
  }, [viewMode, assignmentMap]);

  const scheduleDetailAssigns = useMemo(() => {
    const { open, slot, day } = scheduleDetail;
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
      startTime: slot?.startTime || "08:00",
      endTime: slot?.endTime || "10:00",
      sessionType: String(slot?.sessionType || "MORNING").toUpperCase(),
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const toggleDay = (day) => {
    if (isEditing) {
      setForm((prev) => ({ ...prev, dayOfWeek: [day] }));
      return;
    }
    setForm((prev) => {
      const set = new Set(prev.dayOfWeek);
      if (set.has(day)) set.delete(day);
      else set.add(day);
      return { ...prev, dayOfWeek: [...set].sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b)) };
    });
  };

  const selectWeekdays = () => {
    if (isEditing) return;
    setForm((prev) => ({ ...prev, dayOfWeek: ["MON", "TUE", "WED", "THU", "FRI"] }));
  };

  const selectWeekend = () => {
    if (isEditing) return;
    setForm((prev) => ({ ...prev, dayOfWeek: ["SAT", "SUN"] }));
  };

  const checkOverlap = useCallback(
    (startTime, endTime, selectedDays, excludeTemplateId) => {
      for (const d of selectedDays) {
        const slots = scheduleByDay[d] || [];
        for (const s of slots) {
          if (!slotIsActive(s)) continue;
          if (excludeTemplateId && Number(s.id) === Number(excludeTemplateId)) continue;
          if (intervalsOverlap(startTime, endTime, s.startTime, s.endTime)) {
            return { day: d, other: s };
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
    if (!form.startTime) err.startTime = "Bắt buộc";
    if (!form.endTime) err.endTime = "Bắt buộc";
    if (form.startTime && form.endTime && form.startTime >= form.endTime) {
      err.endTime = "Giờ kết thúc phải sau giờ bắt đầu";
    }
    if (!form.sessionType?.trim()) err.sessionType = "Bắt buộc";

    if (
      !err.startTime &&
      !err.endTime &&
      !err.dayOfWeek &&
      Array.isArray(form.dayOfWeek) &&
      form.dayOfWeek.length > 0
    ) {
      const hit = checkOverlap(form.startTime, form.endTime, form.dayOfWeek, isEditing ? form.templateId : 0);
      if (hit) {
        err.overlap = `Trùng khung giờ với lịch khác (${DAY_LABELS[hit.day]}: ${hit.other.startTime}–${hit.other.endTime})`;
      }
    }

    setFormErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || activeCampusId == null) return;
    setSubmitting(true);
    try {
      const payload = {
        templateId: form.templateId || 0,
        campusId: Number(activeCampusId),
        dayOfWeek: form.dayOfWeek,
        startTime: form.startTime,
        endTime: form.endTime,
        sessionType: String(form.sessionType).trim(),
      };
      const res = await upsertCampusScheduleTemplate(payload);
      const ok = res && res.status >= 200 && res.status < 300;
      if (ok) {
        enqueueSnackbar(form.templateId ? "Đã cập nhật khung giờ." : "Đã thêm khung giờ.", { variant: "success" });
        setDialogOpen(false);
        await loadScheduleForCampus(activeCampusId);
        await loadAssignedSlots();
      } else {
        enqueueSnackbar(mapScheduleTemplateApiMessage(res?.data?.message, "Lưu không thành công."), { variant: "error" });
      }
    } catch (e) {
      console.error(e);
      enqueueSnackbar(scheduleTemplateErrorMessage(e, "Lưu không thành công."), { variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const deactivateSlot = async (slot, day) => {
    if (activeCampusId == null || !slot?.id) return;
    const payload = {
      templateId: Number(slot.id),
      campusId: Number(activeCampusId),
      dayOfWeek: [String(day).toUpperCase()],
      startTime: slot.startTime,
      endTime: slot.endTime,
      sessionType: String(slot.sessionType || "").trim(),
      active: false,
    };
    const res = await upsertCampusScheduleTemplate(payload);
    const ok = res && res.status >= 200 && res.status < 300;
    if (!ok) {
      throw new Error(mapScheduleTemplateApiMessage(res?.data?.message, "Không vô hiệu hóa được"));
    }
  };

  const handleDeleteThisDayOnly = async () => {
    const { slot, day } = deleteDialog;
    if (!slot || !day) return;
    setSubmitting(true);
    try {
      await deactivateSlot(slot, day);
      enqueueSnackbar("Đã vô hiệu hóa khung giờ ngày này.", { variant: "success" });
      setDeleteDialog({ open: false, slot: null, day: null });
      await loadScheduleForCampus(activeCampusId);
      await loadAssignedSlots();
    } catch (e) {
      console.error(e);
      enqueueSnackbar(scheduleTemplateErrorMessage(e, "Thao tác thất bại."), { variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAllRelated = async () => {
    const { slot } = deleteDialog;
    if (!slot) return;
    const related = findRelatedSlots(slot, scheduleByDay);
    if (related.length === 0) {
      setDeleteDialog({ open: false, slot: null, day: null });
      return;
    }
    setSubmitting(true);
    try {
      await Promise.all(related.map(({ slot: s, day: d }) => deactivateSlot(s, d)));
      enqueueSnackbar(`Đã vô hiệu hóa ${related.length} khung giờ liên quan.`, { variant: "success" });
      setDeleteDialog({ open: false, slot: null, day: null });
      await loadScheduleForCampus(activeCampusId);
      await loadAssignedSlots();
    } catch (e) {
      console.error(e);
      enqueueSnackbar(scheduleTemplateErrorMessage(e, "Thao tác thất bại."), { variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const filterSlot = (slot) => {
    if (sessionFilter === "ALL") return true;
    return String(slot.sessionType || "").toUpperCase() === sessionFilter;
  };

  const handleConfirmUnassign = async () => {
    const row = unassignDialog.row;
    if (!row || activeCampusId == null) return;
    const tid = row.schedule?.templateId ?? row.schedule?.template_id;
    const cid = row.counsellor?.id;
    if (tid == null || cid == null) return;
    setUnassignSubmitting(true);
    try {
      const res = await postCounsellorAssign({
        templateId: Number(tid),
        campusId: Number(activeCampusId),
        counsellorIds: [Number(cid)],
        startDate: row.startDate,
        endDate: row.endDate,
        action: "UNASSIGN",
      });
      const ok = res && res.status >= 200 && res.status < 300;
      if (ok) {
        enqueueSnackbar("Đã gỡ gán tư vấn viên.", { variant: "success" });
        setUnassignDialog({ open: false, row: null });
        await loadAssignedSlots();
      } else {
        enqueueSnackbar(mapUnassignErrorMessage(res?.data?.message), { variant: "error" });
      }
    } catch (e) {
      const msg = e?.response?.data?.message ?? e?.message;
      enqueueSnackbar(mapUnassignErrorMessage(msg), { variant: "error" });
    } finally {
      setUnassignSubmitting(false);
    }
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

      if (showCounsellorUi) {
        return (
          <Box
            key={slotKey(slot, day)}
            role="button"
            tabIndex={0}
            onClick={() => setScheduleDetail({ open: true, slot, day })}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setScheduleDetail({ open: true, slot, day });
              }
            }}
            sx={{
              position: "relative",
              p: 1.35,
              borderRadius: RADIUS_INNER,
              background: colors.bg,
              border: emptyStaff ? `2px dashed ${colors.border}` : `1px solid ${colors.border}`,
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
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={0.75}>
              <Box sx={{ flex: 1, minWidth: 0, pr: 0.25 }}>
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
                <Tooltip title="Thao tác">
                  <IconButton
                    size="small"
                    aria-label="Thao tác khung giờ"
                    aria-haspopup="true"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSlotActionsMenu({ anchorEl: e.currentTarget, slot, day });
                    }}
                    sx={{
                      width: 30,
                      height: 30,
                      flexShrink: 0,
                      bgcolor: "rgba(255,255,255,0.95)",
                      border: `1px solid ${BORDER_SOFT}`,
                      borderRadius: "10px",
                      "&:hover": { bgcolor: "#fff", borderColor: "rgba(148,163,184,0.45)" },
                    }}
                  >
                    <MoreVertIcon sx={{ fontSize: 18, color: "#64748B" }} />
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
              {assigns.length === 0 ? "Chưa có người trực" : `Đã có ${assigns.length} người trực`}
            </Typography>
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
                    "& .schedule-card-actions": { opacity: 1, pointerEvents: "auto" },
                  },
            }}
          >
            <Typography sx={{ fontWeight: 700, fontSize: "0.8125rem", color: "#0F172A" }}>
              {slot.startTime} – {slot.endTime}
            </Typography>
            <Typography sx={{ fontSize: "0.75rem", color: colors.accent, fontWeight: 600, mt: 0.25 }}>
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
            {!readOnly && slotIsActive(slot) ? (
              <IconButton
                size="small"
                className="schedule-card-actions"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteDialog({ open: true, slot, day });
                }}
                sx={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  opacity: 0,
                  pointerEvents: "none",
                  transition: "opacity 0.15s",
                  bgcolor: "rgba(255,255,255,0.9)",
                  boxShadow: 1,
                  "&:hover": { bgcolor: "#FEF2F2" },
                }}
                aria-label="Xóa"
              >
                <DeleteOutlineIcon sx={{ fontSize: 18, color: "#DC2626" }} />
              </IconButton>
            ) : null}
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
          gap: { xs: 1.25, md: 1.75 },
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
              <Stack spacing={0.75} sx={{ display: "flex", flexDirection: "column" }}>
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
                          <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 500 }}>
                            —
                          </Typography>
                        </Box>
                      ) : (
                        <Stack spacing={1}>{zoneSlots.map((slot) => renderSlotItem(slot, day))}</Stack>
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
          p: { xs: 2.5, sm: 3.5 },
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
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "stretch", sm: "center" },
            justifyContent: "space-between",
            gap: 2.5,
          }}
        >
          <Box sx={{ maxWidth: { sm: "62%" } }}>
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
                fontSize: { xs: "1.5rem", sm: "1.85rem" },
              }}
            >
              Lịch tư vấn viên
            </Typography>
            <Typography variant="body2" sx={{ mt: 1.25, opacity: 0.92, lineHeight: 1.55, maxWidth: 520 }}>
              Thiết lập khung giờ template, gán tư vấn viên và theo dõi lịch theo tuần hoặc tháng.
            </Typography>
          </Box>
          {viewMode === "manage" ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              disabled={activeCampusId == null || loadingCampuses}
              onClick={openCreate}
              sx={{
                alignSelf: { xs: "stretch", sm: "center" },
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
              Thêm khung giờ
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
            px: { xs: 2, sm: 3 },
            pt: { xs: 2.5, sm: 3 },
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
            <EventAvailableIcon sx={{ color: PRIMARY, fontSize: 26 }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a", lineHeight: 1.25, letterSpacing: "-0.02em" }}>
              Khung giờ tư vấn
            </Typography>
            <Typography variant="body2" sx={{ color: "#64748b", mt: 0.65, lineHeight: 1.55 }}>
              {isPrimaryBranch && viewMode === "overview"
                ? "Xem tổng quan lịch tất cả cơ sở (chỉ đọc)."
                : "Gán tư vấn viên theo khoảng ngày; lọc theo tuần, tháng hoặc theo người."}
            </Typography>
          </Box>
        </Box>

        {isPrimaryBranch ? (
          <Box sx={{ px: { xs: 2, sm: 3 }, pt: 2, pb: 0.5 }}>
            <Tabs
              value={viewMode}
              onChange={(_, v) => setViewMode(v)}
              sx={scheduleTabsSx}
              TabIndicatorProps={{ sx: { height: 3, bgcolor: "#0D64DE" } }}
            >
              <Tab value="manage" label="Chỉnh sửa theo cơ sở" />
              <Tab value="overview" label="Xem tất cả" />
            </Tabs>
          </Box>
        ) : null}

        {viewMode === "manage" ? (
          <>
            <Box sx={{ px: { xs: 2, sm: 3 }, pt: 2, pb: 2 }}>
              <Box
                sx={{
                  ...filterSurfaceSx,
                  p: { xs: 1.75, sm: 2 },
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 2,
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Stack direction="row" flexWrap="wrap" alignItems="center" spacing={1.5} useFlexGap>
                  <ToggleButtonGroup
                    size="small"
                    value={calendarGranularity}
                    exclusive
                    onChange={(_, v) => {
                      if (v) setCalendarGranularity(v);
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
                          "&:hover": { bgcolor: "rgba(13,100,222,0.16)" },
                        },
                      },
                    }}
                  >
                    <ToggleButton value="week">Tuần</ToggleButton>
                    <ToggleButton value="month">Tháng</ToggleButton>
                  </ToggleButtonGroup>
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
                      sx={{ color: "#475569", borderRadius: "10px" }}
                    >
                      <ChevronLeftIcon fontSize="small" />
                    </IconButton>
                    <Typography
                      variant="body2"
                      sx={{
                        minWidth: { xs: 150, sm: 200 },
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
                      sx={{ color: "#475569", borderRadius: "10px" }}
                    >
                      <ChevronRightIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  {calendarGranularity === "month" ? (
                    <TextField
                      size="small"
                      type="month"
                      label="Chọn tháng"
                      value={formatYMD(startOfMonth(calendarAnchorDate)).slice(0, 7)}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v) return;
                        const [y, m] = v.split("-").map(Number);
                        setCalendarAnchorDate(new Date(y, m - 1, 1));
                      }}
                      InputLabelProps={{ shrink: true }}
                      sx={{ width: 168, ...outlineSelectSx }}
                    />
                  ) : null}
                </Stack>
                <Stack direction="row" flexWrap="wrap" spacing={1.5} useFlexGap justifyContent="flex-end">
                  <FormControl
                    size="small"
                    sx={{ minWidth: 188, ...outlineSelectSx }}
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
                  <FormControl size="small" sx={{ minWidth: 168, ...outlineSelectSx }}>
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
            </Box>
          </>
        ) : null}

        <CardContent sx={{ p: { xs: 2, sm: 3 }, pt: viewMode === "manage" ? 1 : { xs: 2, sm: 3 }, "&:last-child": { pb: { xs: 2.5, sm: 3 } } }}>
          {viewMode === "manage" && loadingCampuses ? (
            <Skeleton variant="rounded" height={320} sx={{ borderRadius: 2 }} />
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
                <EventAvailableIcon sx={{ fontSize: 40, color: PRIMARY, opacity: 0.85 }} />
              </Box>
              <Typography sx={{ fontWeight: 700, color: "#334155", fontSize: "1.05rem" }}>Chưa có cơ sở</Typography>
              <Typography variant="body2" sx={{ color: "#94a3b8", mt: 1, maxWidth: 360, mx: "auto", lineHeight: 1.6 }}>
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
                  <Skeleton key={d} variant="rounded" height={400} sx={{ borderRadius: "12px", width: SCHEDULE_DAY_COLUMN_PX }} />
                ))}
              </Box>
            ) : (
              <>
                {loadingAssigned ? (
                  <LinearProgress
                    sx={{
                      mb: 2,
                      borderRadius: 999,
                      height: 3,
                      bgcolor: "rgba(13,100,222,0.08)",
                      "& .MuiLinearProgress-bar": { borderRadius: 999 },
                    }}
                    color="primary"
                  />
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
                  <Skeleton variant="rounded" height={48} />
                  <Skeleton variant="rounded" height={200} />
                </Stack>
              ) : overviewRows.length === 0 ? (
                <Typography sx={{ color: "#64748b" }}>Không có dữ liệu.</Typography>
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
                        "&:before": { display: "none" },
                        overflow: "hidden",
                      }}
                    >
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography sx={{ fontWeight: 600, color: "#334155" }}>
                          {row.campusName || `Cơ sở #${row.campusId}`}
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails sx={{ bgcolor: PAGE_BG, pt: 2 }}>
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
        onClose={() => !submitting && setDialogOpen(false)}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: { borderRadius: "12px" } }}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pr: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {form.templateId ? "Sửa khung giờ" : "Thêm khung giờ mới"}
          </Typography>
          <IconButton onClick={() => setDialogOpen(false)} disabled={submitting} size="small" aria-label="Đóng">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: PAGE_BG }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={3} sx={{ pt: 1 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: "#374151" }}>
                Thời gian & loại buổi
              </Typography>
              <Stack spacing={2}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    label="Bắt đầu"
                    type="time"
                    value={form.startTime}
                    onChange={(e) => {
                      setForm((p) => ({ ...p, startTime: e.target.value }));
                      setFormErrors((er) => ({ ...er, overlap: undefined }));
                    }}
                    error={!!formErrors.startTime || !!formErrors.overlap}
                    helperText={formErrors.startTime || (formErrors.overlap ? " " : "")}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    sx={
                      formErrors.overlap
                        ? {
                            "& .MuiOutlinedInput-notchedOutline": { borderColor: "#DC2626" },
                          }
                        : undefined
                    }
                  />
                  <TextField
                    label="Kết thúc"
                    type="time"
                    value={form.endTime}
                    onChange={(e) => {
                      setForm((p) => ({ ...p, endTime: e.target.value }));
                      setFormErrors((er) => ({ ...er, overlap: undefined }));
                    }}
                    error={!!formErrors.endTime || !!formErrors.overlap}
                    helperText={formErrors.endTime || (formErrors.overlap ? " " : "")}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    sx={
                      formErrors.overlap
                        ? {
                            "& .MuiOutlinedInput-notchedOutline": { borderColor: "#DC2626" },
                          }
                        : undefined
                    }
                  />
                </Stack>
                {formErrors.overlap ? (
                  <Typography variant="caption" sx={{ color: "#DC2626", display: "block", mt: -1 }}>
                    {formErrors.overlap}
                  </Typography>
                ) : null}
                <FormControl fullWidth error={!!formErrors.sessionType}>
                  <InputLabel>Loại buổi</InputLabel>
                  <Select
                    label="Loại buổi"
                    value={String(form.sessionType || "MORNING").toUpperCase()}
                    onChange={(e) => setForm((p) => ({ ...p, sessionType: e.target.value }))}
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
              </Stack>
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: "#374151" }}>
                {isEditing ? "Ngày áp dụng (một bản ghi)" : "Chọn ngày trong tuần"}
              </Typography>
              {!isEditing ? (
                <Stack direction="row" spacing={1} sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
                  <Button size="small" variant="outlined" onClick={selectWeekdays} sx={{ textTransform: "none", borderRadius: "8px" }}>
                    Cả tuần (T2–T6)
                  </Button>
                  <Button size="small" variant="outlined" onClick={selectWeekend} sx={{ textTransform: "none", borderRadius: "8px" }}>
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
                  return (
                    <Button
                      key={d}
                      onClick={() => toggleDay(d)}
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
                          ? { bgcolor: PRIMARY, "&:hover": { bgcolor: "#0a52bd" } }
                          : { borderColor: "#E5E7EB", color: "#6B7280" }),
                      }}
                    >
                      {DAY_SHORT[d]}
                    </Button>
                  );
                })}
              </Box>
              {formErrors.dayOfWeek ? (
                <Typography variant="caption" color="error" sx={{ mt: 1, display: "block" }}>
                  {formErrors.dayOfWeek}
                </Typography>
              ) : null}
              {!isEditing ? (
                <Typography variant="caption" sx={{ color: "#6B7280", mt: 1.5, display: "block" }}>
                  Có thể chọn nhiều ngày.
                </Typography>
              ) : (
                <Typography variant="caption" sx={{ color: "#6B7280", mt: 1.5, display: "block" }}>
                  Sửa chỉ áp dụng cho một bản ghi (một ngày).
                </Typography>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, bgcolor: "#fff", borderTop: "1px solid #E5E7EB" }}>
          <Button onClick={() => setDialogOpen(false)} disabled={submitting} sx={{ textTransform: "none", color: "#6B7280" }}>
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
              "&:hover": { bgcolor: "#0a52bd", boxShadow: "none" },
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
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
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
        <MenuItem
          onClick={() => {
            const { slot: s, day: d } = slotActionsMenu;
            closeSlotActionsMenu();
            if (s && d) openEdit(s, d);
          }}
          sx={{ py: 1.1, borderRadius: "10px", mx: 0.5, mt: 0.5 }}
        >
          <ListItemIcon sx={{ minWidth: 38 }}>
            <EditOutlinedIcon fontSize="small" sx={{ color: "#475569" }} />
          </ListItemIcon>
          <ListItemText
            primary="Sửa khung giờ"
            primaryTypographyProps={{ fontWeight: 600, fontSize: "0.875rem" }}
          />
        </MenuItem>
        <MenuItem
          onClick={() => {
            const { slot: s, day: d } = slotActionsMenu;
            closeSlotActionsMenu();
            if (s && d && counsellorGridApi) counsellorGridApi.onAssign(s, d);
          }}
          sx={{ py: 1.1, borderRadius: "10px", mx: 0.5 }}
        >
          <ListItemIcon sx={{ minWidth: 38 }}>
            <PersonAddAlt1Icon fontSize="small" sx={{ color: PRIMARY }} />
          </ListItemIcon>
          <ListItemText
            primary="Gán tư vấn viên"
            primaryTypographyProps={{ fontWeight: 600, fontSize: "0.875rem" }}
          />
        </MenuItem>
        <MenuItem
          onClick={() => {
            const { slot: s, day: d } = slotActionsMenu;
            closeSlotActionsMenu();
            if (s && d) setDeleteDialog({ open: true, slot: s, day: d });
          }}
          sx={{ py: 1.1, borderRadius: "10px", mx: 0.5, mb: 0.5, color: "error.main" }}
        >
          <ListItemIcon sx={{ minWidth: 38 }}>
            <DeleteOutlineIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText
            primary="Vô hiệu hóa khung giờ"
            primaryTypographyProps={{ fontWeight: 600, fontSize: "0.875rem" }}
          />
        </MenuItem>
      </Menu>

      <ScheduleSlotDetailModal
        open={scheduleDetail.open}
        onClose={() => setScheduleDetail({ open: false, slot: null, day: null })}
        slot={scheduleDetail.slot}
        dayLabel={scheduleDetail.day ? DAY_LABELS[scheduleDetail.day] : "—"}
        sessionLabel={sessionTypeLabel(scheduleDetail.slot?.sessionType)}
        campusName={displayCampusConfigName(activeCampus?.campusName ?? activeCampus?.campus_name, activeCampusIndex)}
        assigns={scheduleDetailAssigns}
        slotActive={scheduleDetail.slot ? slotIsActive(scheduleDetail.slot) : true}
        onAssign={() => {
          const { slot, day } = scheduleDetail;
          if (slot && day && counsellorGridApi) counsellorGridApi.onAssign(slot, day);
        }}
        onEdit={() => {
          const { slot, day } = scheduleDetail;
          setScheduleDetail({ open: false, slot: null, day: null });
          if (slot && day) openEdit(slot, day);
        }}
        onDeleteSchedule={() => {
          const { slot, day } = scheduleDetail;
          setScheduleDetail({ open: false, slot: null, day: null });
          if (slot && day) setDeleteDialog({ open: true, slot, day });
        }}
        onRemoveCounsellor={(row) => setUnassignDialog({ open: true, row })}
      />

      <CounsellorAssignModal
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        campusId={activeCampusId}
        templateId={assignSlotCtx.slot?.id ?? assignSlotCtx.slot?.templateId}
        dayOfWeekKey={assignSlotCtx.day ?? null}
        dayOfWeek={assignSlotCtx.day ? DAY_LABELS[assignSlotCtx.day] : "—"}
        startTime={assignSlotCtx.slot?.startTime ?? ""}
        endTime={assignSlotCtx.slot?.endTime ?? ""}
        sessionTypeLabelText={sessionTypeLabel(assignSlotCtx.slot?.sessionType)}
        defaultStartDate={viewStartStr}
        defaultEndDate={viewEndStr}
        onSuccess={() => loadAssignedSlots()}
      />

      <Dialog
        open={unassignDialog.open}
        onClose={() => !unassignSubmitting && setUnassignDialog({ open: false, row: null })}
        PaperProps={{ sx: { borderRadius: "12px", maxWidth: 440 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Gỡ tư vấn viên?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: "#4B5563", mb: 1.5 }}>
            Bạn có chắc muốn gỡ{" "}
            <strong>{unassignDialog.row ? assignedCounsellorLabel(unassignDialog.row.counsellor) : ""}</strong> khỏi
            khung giờ này trong khoảng:
          </Typography>
          {unassignDialog.row ? (
            <Typography variant="body2" sx={{ fontWeight: 600, color: "#111827" }}>
              {unassignDialog.row.startDate} → {unassignDialog.row.endDate}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => !unassignSubmitting && setUnassignDialog({ open: false, row: null })} sx={{ textTransform: "none" }}>
            Hủy
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmUnassign}
            disabled={unassignSubmitting}
            sx={{ textTransform: "none" }}
          >
            Gỡ gán
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteDialog.open}
        onClose={() => !submitting && setDeleteDialog({ open: false, slot: null, day: null })}
        PaperProps={{ sx: { borderRadius: "12px" } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Vô hiệu hóa khung giờ?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: "#4B5563", mb: 2 }}>
            Chọn phạm vi: chỉ ngày đang chọn, hoặc tất cả các ngày có cùng khung giờ và loại buổi (08:00–10:00, cùng session).
          </Typography>
          {deleteDialog.slot ? (
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {deleteDialog.slot.startTime} – {deleteDialog.slot.endTime} · {sessionTypeLabel(deleteDialog.slot.sessionType)} ·{" "}
              {deleteDialog.day ? DAY_LABELS[deleteDialog.day] : ""}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions
          sx={{
            flexDirection: "column",
            alignItems: "stretch",
            px: 3,
            pb: 2,
            gap: 1,
            /* MUI mặc định margin-left cho nút sau nút đầu — với cột làm lệch trái */
            "& > :not(style) ~ :not(style)": { marginLeft: 0 },
            "& .MuiButton-root": { width: "100%", maxWidth: "100%", boxSizing: "border-box" },
          }}
        >
          <Button
            variant="outlined"
            onClick={handleDeleteThisDayOnly}
            disabled={submitting}
            sx={{ textTransform: "none", borderRadius: "10px" }}
          >
            Chỉ ngày này
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteAllRelated}
            disabled={submitting}
            sx={{ textTransform: "none", borderRadius: "10px" }}
          >
            Tất cả ngày cùng khung giờ
          </Button>
          <Button
            onClick={() => setDeleteDialog({ open: false, slot: null, day: null })}
            disabled={submitting}
            sx={{ textTransform: "none", borderRadius: "10px" }}
          >
            Hủy
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
