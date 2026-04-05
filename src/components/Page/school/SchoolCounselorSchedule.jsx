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
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { enqueueSnackbar } from "notistack";
import {
  getCampusScheduleTemplateList,
  getSchoolCampusScheduleTemplateList,
  normalizeScheduleTemplateDayMap,
  parseCampusScheduleTemplateListBody,
  parseSchoolCampusScheduleTemplateListBody,
  parseSchoolCampusScheduleTemplateListPageMeta,
  upsertCampusScheduleTemplate,
} from "../../../services/CampusScheduleTemplateService.jsx";
import {
  getSchoolCampusConfigList,
  parseSchoolCampusConfigListBody,
} from "../../../services/SchoolFacilityService.jsx";

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
const PAGE_BG = "#F9FAFB";

const scheduleTabsSx = {
  minHeight: 48,
  "& .MuiTabs-flexContainer": { gap: 0.5 },
  "& .MuiTab-root": {
    minHeight: 48,
    px: 2,
    py: 1,
    textTransform: "none",
    fontSize: "0.9375rem",
    fontFamily: '"Inter", "SF Pro Display", system-ui, sans-serif',
    color: "#64748b",
    fontWeight: 500,
    borderRadius: "8px",
    transition: "all 0.2s ease",
    "&:hover": {
      color: "#334155",
      bgcolor: "rgba(148, 163, 184, 0.12)",
    },
    "&.Mui-selected": {
      color: "#0D64DE",
      fontWeight: 700,
    },
  },
  "& .MuiTabs-indicator": {
    height: 3,
    borderRadius: "3px 3px 0 0",
    bgcolor: "#0D64DE",
    transition: "all 0.2s ease",
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

function sessionCardColors(sessionType) {
  const v = String(sessionType || "").toUpperCase();
  if (v === "MORNING") {
    return {
      bg: "#FFFBEB",
      border: "#FDE68A",
      accent: "#D97706",
      label: "Sáng",
    };
  }
  if (v === "AFTERNOON") {
    return {
      bg: "#EFF6FF",
      border: "#BFDBFE",
      accent: "#2563EB",
      label: "Chiều",
    };
  }
  if (v === "EVENING") {
    return {
      bg: "#F5F3FF",
      border: "#DDD6FE",
      accent: "#7C3AED",
      label: "Tối",
    };
  }
  return {
    bg: "#F1F5F9",
    border: "#E2E8F0",
    accent: "#64748B",
    label: sessionTypeLabel(sessionType),
  };
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
  const [campusRows, setCampusRows] = useState([]);
  const [selectedCampusIndex, setSelectedCampusIndex] = useState(0);
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
  const [overviewPage, setOverviewPage] = useState(1);
  const [overviewTotalPages, setOverviewTotalPages] = useState(1);
  const [loadingOverview, setLoadingOverview] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [deleteDialog, setDeleteDialog] = useState({ open: false, slot: null, day: null });

  const overviewPageSize = 8;

  const loadCampuses = useCallback(async () => {
    setLoadingCampuses(true);
    try {
      const [configRes, schoolScheduleRes] = await Promise.all([
        getSchoolCampusConfigList(),
        getSchoolCampusScheduleTemplateList({ page: 0, pageSize: 200 }).catch(() => null),
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
  }, []);

  const loadOverview = useCallback(async (page1Based) => {
    setLoadingOverview(true);
    try {
      const page = Math.max(0, page1Based - 1);
      const res = await getSchoolCampusScheduleTemplateList({ page, pageSize: overviewPageSize });
      if (res?.status !== 200) {
        throw new Error(res?.data?.message || "Không tải được dữ liệu");
      }
      setOverviewRows(parseSchoolCampusScheduleTemplateListBody(res));
      setOverviewTotalPages(parseSchoolCampusScheduleTemplateListPageMeta(res).totalPages);
    } catch (e) {
      console.error(e);
      enqueueSnackbar(e?.response?.data?.message || e?.message || "Không tải được tổng quan lịch.", {
        variant: "error",
      });
      setOverviewRows([]);
      setOverviewTotalPages(1);
    } finally {
      setLoadingOverview(false);
    }
  }, [overviewPageSize]);

  useEffect(() => {
    loadCampuses();
  }, [loadCampuses]);

  useEffect(() => {
    if (viewMode === "overview") {
      loadOverview(overviewPage);
    }
  }, [viewMode, overviewPage, loadOverview]);

  const activeCampus = campusRows[selectedCampusIndex] || null;
  const activeCampusId = activeCampus?.campusId ?? activeCampus?.id;

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

  useEffect(() => {
    if (selectedCampusIndex >= campusRows.length) {
      setSelectedCampusIndex(0);
    }
  }, [campusRows.length, selectedCampusIndex]);

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

  const campusSelectValue = useMemo(() => {
    if (!campusRows.length) return "";
    const idx = Math.min(selectedCampusIndex, campusRows.length - 1);
    return String(campusRows[idx]?.campusId ?? campusRows[idx]?.id ?? idx);
  }, [campusRows, selectedCampusIndex]);

  const renderWeeklyGrid = (byDay, { readOnly = false, campusLabel = "", applySessionFilter = true } = {}) => (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "repeat(7, minmax(120px, 1fr))", md: "repeat(7, 1fr)" },
        gap: 1.5,
        overflowX: "auto",
        pb: 0.5,
      }}
    >
      {DAYS.map((day) => {
        const slots = (byDay[day] || []).filter((s) => (applySessionFilter ? filterSlot(s) : true));
        return (
          <Box
            key={day}
            sx={{
              minHeight: 280,
              bgcolor: "#fff",
              borderRadius: "12px",
              border: "1px solid #E5E7EB",
              p: 1.25,
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
            <Typography sx={{ fontWeight: 700, fontSize: "0.8125rem", color: "#111827", textAlign: "center" }}>
              {DAY_SHORT[day]}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "#6B7280", textAlign: "center", display: "block", mb: 0.5, lineHeight: 1.2 }}
            >
              {DAY_LABELS[day]}
            </Typography>
            <Stack spacing={1} sx={{ flex: 1, minHeight: 0 }}>
              {slots.length === 0 ? (
                <Typography variant="caption" sx={{ color: "#9CA3AF", textAlign: "center", py: 2, fontStyle: "italic" }}>
                  Trống
                </Typography>
              ) : (
                slots.map((slot) => {
                  const colors = sessionCardColors(slot.sessionType);
                  const tipCampus =
                    campusLabel ||
                    displayCampusConfigName(activeCampus?.campusName ?? activeCampus?.campus_name, selectedCampusIndex);
                  const tip = [`${slot.startTime} – ${slot.endTime}`, sessionTypeLabel(slot.sessionType), tipCampus].join(
                    " · "
                  );

                  return (
                    <Tooltip key={slot.id ?? `${day}-${slot.startTime}`} title={tip} placement="top" arrow>
                      <Box
                        role={readOnly ? undefined : "button"}
                        tabIndex={readOnly ? undefined : 0}
                        onClick={
                          readOnly
                            ? undefined
                            : () => {
                                openEdit(slot, day);
                              }
                        }
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
                          p: 1.25,
                          borderRadius: "10px",
                          bgcolor: colors.bg,
                          border: `1px solid ${colors.border}`,
                          boxShadow: "0 1px 3px rgba(15,23,42,0.06)",
                          opacity: slotIsActive(slot) ? 1 : 0.55,
                          transition: "box-shadow 0.2s, transform 0.15s",
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
                                boxShadow: "0 6px 16px rgba(15,23,42,0.1)",
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
                          <Chip label="Ngưng" size="small" sx={{ mt: 0.75, height: 22, fontSize: "0.65rem" }} />
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
                })
              )}
            </Stack>
          </Box>
        );
      })}
    </Box>
  );

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 3,
        width: "100%",
        pb: 4,
        fontFamily: '"Inter", "SF Pro Display", system-ui, sans-serif',
      }}
    >
      {/* Header — cùng style SchoolCampaigns */}
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
                fontWeight: 700,
                letterSpacing: "-0.02em",
                textShadow: "0 1px 2px rgba(0,0,0,0.1)",
              }}
            >
              Lịch tư vấn viên
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.95 }}>
              Thiết lập khung giờ template theo cơ sở — xem nhanh cả tuần, thêm nhiều ngày cùng lúc.
            </Typography>
          </Box>
          {viewMode === "manage" ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              disabled={activeCampusId == null || loadingCampuses}
              onClick={openCreate}
              sx={{
                bgcolor: "rgba(255,255,255,0.95)",
                color: "#0D64DE",
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
                px: 3,
                py: 1.5,
                boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
                "&:hover": {
                  bgcolor: "white",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
                },
              }}
            >
              Thêm lịch
            </Button>
          ) : null}
        </Box>
      </Box>

      <Card
        elevation={0}
        sx={{
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 24px rgba(51,65,85,0.06)",
          bgcolor: "#fff",
          overflow: "hidden",
        }}
      >
        {/* Tiêu đề trong card — cùng kiểu SchoolCampaigns */}
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
          <EventAvailableIcon sx={{ color: "#0D64DE", fontSize: 28, mt: 0.25 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#1e293b", lineHeight: 1.3 }}>
              Khung giờ tư vấn
            </Typography>
            <Typography variant="body2" sx={{ color: "#64748b", mt: 0.5 }}>
              {viewMode === "overview"
                ? "Xem tổng quan lịch tất cả cơ sở (chỉ đọc)."
                : "Chọn cơ sở, lọc theo buổi và chỉnh sửa lịch trong tuần."}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ px: 2.5 }}>
          <Tabs
            value={viewMode}
            onChange={(_, v) => setViewMode(v)}
            sx={scheduleTabsSx}
            TabIndicatorProps={{ sx: { height: 3, bgcolor: "#0D64DE" } }}
          >
            <Tab value="manage" label="Chỉnh sửa theo cơ sở" />
            <Tab value="overview" label="Xem tất cả (chỉ đọc)" />
          </Tabs>
        </Box>

        {viewMode === "manage" ? (
          <>
            <Divider />
            <Box
              sx={{
                px: 2.5,
                py: 2,
                display: "flex",
                flexWrap: "wrap",
                gap: 1.5,
                justifyContent: "flex-end",
                alignItems: "center",
              }}
            >
              <FormControl size="small" sx={{ minWidth: 160 }}>
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
              <FormControl size="small" sx={{ minWidth: 200 }} disabled={loadingCampuses || campusRows.length === 0}>
                <InputLabel>Cơ sở</InputLabel>
                <Select
                  label="Cơ sở"
                  value={campusSelectValue}
                  onChange={(e) => {
                    const v = e.target.value;
                    const idx = campusRows.findIndex((c) => String(c.campusId ?? c.id) === String(v));
                    if (idx >= 0) setSelectedCampusIndex(idx);
                  }}
                >
                  {campusRows.map((c, i) => (
                    <MenuItem key={c.campusId ?? c.id ?? i} value={String(c.campusId ?? c.id ?? i)}>
                      {displayCampusConfigName(c.campusName ?? c.campus_name, i)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </>
        ) : null}

        <Divider />

        <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
          {viewMode === "manage" && loadingCampuses ? (
            <Skeleton variant="rounded" height={320} sx={{ borderRadius: 2 }} />
          ) : null}

          {viewMode === "manage" && !loadingCampuses && campusRows.length === 0 ? (
            <Box sx={{ p: 5, textAlign: "center" }}>
              <EventAvailableIcon sx={{ fontSize: 56, color: "#cbd5e1", mb: 1 }} />
              <Typography sx={{ fontWeight: 600, color: "#64748b" }}>Chưa có cơ sở</Typography>
              <Typography variant="body2" sx={{ color: "#94a3b8", mt: 0.5 }}>
                Thêm cơ sở trong mục Cấu hình cơ sở trước khi thiết lập lịch.
              </Typography>
            </Box>
          ) : null}

          {viewMode === "manage" && !loadingCampuses && campusRows.length > 0 ? (
            loadingSchedule ? (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  gap: 1.5,
                }}
              >
                {DAYS.map((d) => (
                  <Skeleton key={d} variant="rounded" height={260} sx={{ borderRadius: "12px" }} />
                ))}
              </Box>
            ) : (
              renderWeeklyGrid(scheduleByDay, { readOnly: false, applySessionFilter: true })
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
                        })}
                      </AccordionDetails>
                    </Accordion>
                  ))}
                  <Stack alignItems="center" sx={{ mt: 2 }}>
                    <Pagination
                      count={overviewTotalPages}
                      page={overviewPage}
                      onChange={(_, p) => setOverviewPage(p)}
                      sx={{
                        "& .MuiPaginationItem-root": { borderRadius: "8px" },
                        "& .Mui-selected": { bgcolor: "#0D64DE !important", color: "#fff" },
                      }}
                    />
                  </Stack>
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
