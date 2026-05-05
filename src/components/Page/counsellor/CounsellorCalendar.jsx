import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  alpha,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import TodayIcon from "@mui/icons-material/Today";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import StickyNote2OutlinedIcon from "@mui/icons-material/StickyNote2Outlined";
import { enqueueSnackbar } from "notistack";
import { getCounsellorCalendar, parseCounsellorCalendarBody } from "../../../services/CounsellorCalendarService.jsx";
import { putCounsellorOfflineConsultation } from "../../../services/CounsellorOfflineConsultationService.jsx";
import {
  counsellorGradientHeaderCardSx,
  counsellorInnerCardSx,
  counsellorShellOuterSx,
} from "./counsellorShellSx.js";

const CALENDAR_DAYS = [
  { key: "MON", label: "Th 2", offset: 0 },
  { key: "TUE", label: "Th 3", offset: 1 },
  { key: "WED", label: "Th 4", offset: 2 },
  { key: "THU", label: "Th 5", offset: 3 },
  { key: "FRI", label: "Th 6", offset: 4 },
  { key: "SAT", label: "Th 7", offset: 5 },
  { key: "SUN", label: "CN", offset: 6 },
];

const CAL_HEADER_BG = "rgba(95, 125, 185, 0.9)";
const CAL_CARD_BORDER = "1px solid rgba(59, 130, 246, 0.12)";
const CAL_GRID_LINE_ROW = "1px solid rgba(100, 116, 139, 0.2)";
const CAL_GRID_LINE_COL = "1px solid rgba(100, 116, 139, 0.16)";
const CAL_GRID_HEADER_COL = "1px solid rgba(255, 255, 255, 0.35)";
const CAL_BRAND = "rgba(95, 125, 185, 0.95)";
const CAL_BRAND_HOVER = "rgba(84, 112, 168, 0.98)";

const STATUS_COLOR = {
  UPCOMING: "info",
  ONGOING: "success",
  COMPLETED: "default",
  CANCELLED: "error",
};

const detailModalSx = {
  pageBg: "#e8f4fc",
  sectionBorder: "1px solid #b0cfe8",
  sectionInnerBg: "rgba(255,255,255,0.72)",
  labelColor: "#1565c0",
  titleColor: "#0d47a1",
  valueColor: "#1e293b",
  fieldBorder: "1px solid #cfe8f8",
  headerBar: "linear-gradient(180deg, #dceef9 0%, #c9e3f5 100%)",
};

const detailDialogPaperProps = {
  elevation: 0,
  sx: {
    borderRadius: 2.5,
    overflow: "hidden",
    border: "1px solid #9ec9e8",
    boxShadow: "0 20px 45px -12px rgba(13, 71, 161, 0.18)",
  },
};

function hasOfflineAppointment(slot) {
  const req = slot?.consultationOfflineRequest;
  if (Array.isArray(req)) return req.length > 0;
  return req != null;
}

function pickFirstOfflineAppointment(slot) {
  const req = slot?.consultationOfflineRequest;
  if (Array.isArray(req)) return req[0] || null;
  return req || null;
}

function consultationStatusLabel(status) {
  const s = String(status || "").toUpperCase();
  if (s.includes("PENDING")) return "Chờ xử lý";
  if (s.includes("CONFIRM")) return "Đã xác nhận";
  if (s.includes("IN_PROGRESS") || s.includes("IN-PROGRESS")) return "Đang tư vấn";
  if (s.includes("COMPLETE")) return "Hoàn tất";
  if (s.includes("CANCEL")) return "Đã hủy";
  return String(status || "—").replace(/^CONSULTATION_/i, "").replace(/_/g, " ").trim() || "—";
}

function consultationStatusChipSx(status) {
  const s = String(status || "").toUpperCase();
  if (s.includes("PENDING")) {
    return {
      bgcolor: "rgba(245,158,11,0.16)",
      color: "#f59e0b",
      border: "1px solid rgba(245,158,11,0.35)",
      fontWeight: 700,
    };
  }
  if (s.includes("CONFIRM")) {
    return {
      bgcolor: "rgba(250,204,21,0.18)", 
      color: "#eab308",
      border: "1px solid rgba(234,179,8,0.45)",
      fontWeight: 700,
    };
  }
  if (s.includes("IN_PROGRESS") || s.includes("IN-PROGRESS")) {
    return {
      bgcolor: "rgba(59,130,246,0.16)", 
      color: "#2563eb",
      border: "1px solid rgba(37,99,235,0.45)",
      fontWeight: 700,
    };
  }
  if (s.includes("COMPLETE")) {
    return {
      bgcolor: "rgba(22,163,74,0.16)", 
      color: "#16a34a",
      border: "1px solid rgba(22,163,74,0.35)",
      fontWeight: 700,
    };
  }
  if (s.includes("CANCEL")) {
    return {
      bgcolor: "rgba(239,68,68,0.16)",
      color: "#ef4444",
      border: "1px solid rgba(239,68,68,0.35)",
      fontWeight: 700,
    };
  }
  return {
    bgcolor: "rgba(148,163,184,0.16)",
    color: "#64748b",
    border: "1px solid rgba(148,163,184,0.35)",
    fontWeight: 700,
  };
}

function consultationIsInProgress(status) {
  const s = String(status || "").toUpperCase();
  return s.includes("IN_PROGRESS") || s.includes("IN-PROGRESS");
}

function consultationIsDone(status) {
  const s = String(status || "").toUpperCase();
  return s.includes("COMPLETE") || s.includes("NO_SHOW") || s.includes("NO-SHOW") || s.includes("CANCEL");
}

function DetailSection({ title, icon, children }) {
  return (
    <Box
      sx={{
        border: detailModalSx.sectionBorder,
        borderRadius: 2.5,
        p: 2,
        bgcolor: detailModalSx.sectionInnerBg,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "rgba(21, 101, 160, 0.12)",
            color: detailModalSx.titleColor,
          }}
        >
          {icon}
        </Box>
        <Typography sx={{ fontSize: 17, fontWeight: 800, color: detailModalSx.titleColor, letterSpacing: "-0.02em" }}>
          {title}
        </Typography>
      </Stack>
      {children}
    </Box>
  );
}

function slotLooksCompleted(status, statusLabel) {
  const s = String(status || "").toUpperCase();
  if (s === "COMPLETED") return true;
  return String(statusLabel || "")
    .trim()
    .toLowerCase()
    .includes("đã qua");
}

function calendarSlotChipSx(status, statusLabel) {
  const s = String(status || "").toUpperCase();
  const label = {
    px: 0.75,
    display: "block",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    lineHeight: 1.25,
  };
  const base = {
    height: 26,
    maxWidth: "100%",
    fontSize: "0.68rem",
    overflow: "hidden",
    "& .MuiChip-label": label,
  };
  if (slotLooksCompleted(s, statusLabel)) {
    return {
      ...base,
      fontWeight: 600,
      borderRadius: "6px",
      boxShadow: "none",
      bgcolor: "rgba(255,255,255,0.88)",
      color: "#475569",
      border: "1px solid rgba(148,163,184,0.65)",
      "&:hover": {
        bgcolor: "rgba(255,255,255,0.98)",
        borderColor: "rgba(100,116,139,0.55)",
      },
    };
  }
  return {
    ...base,
    fontWeight: 700,
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(15,23,42,0.07)",
  };
}

const toYmd = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const startOfWeekMonday = (date) => {
  const value = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = value.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  value.setDate(value.getDate() + diff);
  return value;
};

const addDays = (date, amount) => {
  const value = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  value.setDate(value.getDate() + amount);
  return value;
};

const formatDateVi = (date) =>
  date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const normalizeTime = (value) => String(value || "").slice(0, 5);
const timeToMinutes = (value) => {
  const [h, m] = String(value || "")
    .split(":")
    .map((x) => Number(x));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
};

const detectSessionKey = (startTime) => {
  const mins = timeToMinutes(startTime);
  if (!Number.isFinite(mins)) return "AFTERNOON";
  return mins < 12 * 60 ? "MORNING" : "AFTERNOON";
};

function slotWindowSortKey(startTime, endTime) {
  const sm = timeToMinutes(startTime);
  const em = timeToMinutes(endTime);
  if (Number.isFinite(sm) && Number.isFinite(em)) return sm * 1440 + em;
  return `${startTime}\0${endTime}`;
}

export default function CounsellorCalendar() {
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [calendarRows, setCalendarRows] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [appointmentFlowStep, setAppointmentFlowStep] = useState("initial");
  const [completionNote, setCompletionNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const weekDays = useMemo(() => {
    const monday = startOfWeekMonday(anchorDate);
    return CALENDAR_DAYS.map((day, index) => {
      const date = addDays(monday, index);
      return {
        dayKey: day.key,
        dayLabel: day.label,
        date,
        dateYmd: toYmd(date),
      };
    });
  }, [anchorDate]);

  const weekRangeLabel = useMemo(() => {
    if (weekDays.length === 0) return "";
    return `${formatDateVi(weekDays[0].date)} - ${formatDateVi(weekDays[6].date)}`;
  }, [weekDays]);

  const uniqueSlotWindows = useMemo(() => {
    const byKey = new Map();
    calendarRows.forEach((slot) => {
      const startTime = normalizeTime(slot?.startTime);
      const endTime = normalizeTime(slot?.endTime);
      if (!startTime || !endTime) return;
      const key = `${startTime}|${endTime}`;
      if (!byKey.has(key)) byKey.set(key, { startTime, endTime, key });
    });
    return Array.from(byKey.values()).sort(
      (a, b) => slotWindowSortKey(a.startTime, a.endTime) - slotWindowSortKey(b.startTime, b.endTime)
    );
  }, [calendarRows]);

  const slotWindowsBySession = useMemo(() => {
    const morning = [];
    const afternoon = [];
    uniqueSlotWindows.forEach((w) => {
      (detectSessionKey(w.startTime) === "MORNING" ? morning : afternoon).push(w);
    });
    return { morning, afternoon };
  }, [uniqueSlotWindows]);

  const slotsByDayAndWindow = useMemo(() => {
    const map = new Map();
    calendarRows.forEach((slot) => {
      const date = String(slot?.date || "").slice(0, 10);
      const startTime = normalizeTime(slot?.startTime);
      const endTime = normalizeTime(slot?.endTime);
      if (!date || !startTime || !endTime) return;
      const cellKey = `${date}|${startTime}|${endTime}`;
      if (!map.has(cellKey)) map.set(cellKey, []);
      map.get(cellKey).push(slot);
    });
    map.forEach((arr) => {
      arr.sort((a, b) => String(a?.status || "").localeCompare(String(b?.status || "")));
    });
    return map;
  }, [calendarRows]);

  const loadCalendar = useCallback(async () => {
    if (weekDays.length !== 7) return;
    const startDate = weekDays[0].dateYmd;
    const endDate = weekDays[6].dateYmd;
    setLoading(true);
    setError("");
    try {
      const response = await getCounsellorCalendar({ startDate, endDate });
      const body = parseCounsellorCalendarBody(response);

      const dedupMap = new Map();
      body.forEach((item) => {
        const date = String(item?.date || "").slice(0, 10);
        const startTime = normalizeTime(item?.startTime);
        const endTime = normalizeTime(item?.endTime);
        const status = String(item?.status || "").toUpperCase();
        const key = `${date}|${startTime}|${endTime}|${status}`;
        if (!dedupMap.has(key)) {
          const reqRaw = item?.consultationOfflineRequest;
          dedupMap.set(key, {
            date,
            dayOfWeek: String(item?.dayOfWeek || "").toUpperCase(),
            startTime,
            endTime,
            status: status || "UPCOMING",
            statusLabel: item?.statusLabel || "Sắp diễn ra",
            counsellorSlotId: item?.counsellorSlotId ?? item?.slotId ?? null,
            consultationOfflineRequest: Array.isArray(reqRaw) ? reqRaw : reqRaw != null ? [reqRaw] : [],
          });
        }
      });

      const rows = Array.from(dedupMap.values()).sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.startTime.localeCompare(b.startTime);
      });

      setCalendarRows(rows);
    } catch (e) {
      console.error(e);
      setCalendarRows([]);
      setError("Không thể tải lịch tư vấn. Vui lòng thử lại.");
      enqueueSnackbar("Không thể tải lịch tư vấn.", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [weekDays]);

  useEffect(() => {
    void loadCalendar();
  }, [loadCalendar]);

  return (
    <Box
      sx={{
        width: "calc(100% + 48px)",
        ml: "-24px",
        mr: "-24px",
        px: { xs: 1, md: 1.5 },
        pb: 2,
        boxSizing: "border-box",
        position: "relative",
        minWidth: 0,
      }}
    >
      <Box
        sx={{
          p: { xs: 1, md: 2 },
          borderRadius: 4,
          bgcolor: "rgba(255, 255, 255, 0.92)",
          color: "#1e293b",
          ...counsellorShellOuterSx,
        }}
      >
        <Card elevation={0} sx={counsellorGradientHeaderCardSx}>
          <CardContent sx={{ p: { xs: 1.5, md: 1.9 }, "&:last-child": { pb: { xs: 1.5, md: 1.9 } } }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Avatar
                sx={{
                  bgcolor: alpha("#ffffff", 0.22),
                  color: "white",
                  width: 34,
                  height: 34,
                  border: "1px solid rgba(255,255,255,0.32)",
                }}
              >
                <CalendarMonthOutlinedIcon sx={{ fontSize: 20 }} />
              </Avatar>
              <Box>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 800, lineHeight: 1.2, textShadow: "0 1px 3px rgba(15,23,42,0.12)" }}
                >
                  Lịch tư vấn trực tiếp
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    opacity: 0.92,
                    mt: 0.3,
                    fontSize: 13,
                    fontWeight: 500,
                    textShadow: "0 1px 2px rgba(15,23,42,0.1)",
                  }}
                >
                  Theo dõi lịch làm việc theo tuần của tư vấn viên.
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card elevation={0} sx={{ ...counsellorInnerCardSx, borderRadius: 2 }}>
          <CardContent sx={{ p: { xs: 2, sm: 2.5 }, "&:last-child": { pb: { xs: 2, sm: 2.5 } } }}>
            <Stack spacing={2}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Button
                    variant="outlined"
                    startIcon={<ChevronLeftIcon />}
                    onClick={() => setAnchorDate((prev) => addDays(prev, -7))}
                    sx={{
                      textTransform: "none",
                      fontWeight: 700,
                      borderRadius: "12px",
                      borderColor: "rgba(100,116,139,0.26)",
                      color: "#334155",
                      px: 1.8,
                      "&:hover": {
                        borderColor: "rgba(108,143,207,0.45)",
                        bgcolor: "rgba(108,143,207,0.07)",
                      },
                    }}
                  >
                    Tuần trước
                  </Button>
                  <Button
                    variant="outlined"
                    endIcon={<ChevronRightIcon />}
                    onClick={() => setAnchorDate((prev) => addDays(prev, 7))}
                    sx={{
                      textTransform: "none",
                      fontWeight: 700,
                      borderRadius: "12px",
                      borderColor: "rgba(100,116,139,0.26)",
                      color: "#334155",
                      px: 1.8,
                      "&:hover": {
                        borderColor: "rgba(108,143,207,0.45)",
                        bgcolor: "rgba(108,143,207,0.07)",
                      },
                    }}
                  >
                    Tuần sau
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<TodayIcon />}
                    onClick={() => setAnchorDate(new Date())}
                    sx={{
                      textTransform: "none",
                      fontWeight: 700,
                      borderRadius: "12px",
                      px: 2,
                      boxShadow: "0 4px 14px rgba(95,125,185,0.22)",
                      bgcolor: CAL_BRAND,
                      "&:hover": {
                        bgcolor: CAL_BRAND_HOVER,
                        boxShadow: "0 6px 16px rgba(84,112,168,0.26)",
                      },
                    }}
                  >
                    Tuần này
                  </Button>
                </Stack>
                <Box
                  sx={{
                    px: 1.5,
                    py: 0.8,
                    borderRadius: "12px",
                    border: "1px solid rgba(108,143,207,0.22)",
                    bgcolor: "rgba(108,143,207,0.08)",
                  }}
                >
                  <Typography sx={{ fontWeight: 700, color: CAL_BRAND, fontSize: "0.9rem", letterSpacing: "0.01em" }}>
                    {weekRangeLabel}
                  </Typography>
                </Box>
              </Stack>

              {error ? <Alert severity="error">{error}</Alert> : null}

              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                  <CircularProgress size={28} sx={{ color: CAL_BRAND }} />
                </Box>
              ) : (
                <Box sx={{ width: "100%", minWidth: 0, overflowX: "auto", pb: 0.5 }}>
                  <Box
                    sx={{
                      border: CAL_CARD_BORDER,
                      borderRadius: 2,
                      overflow: "hidden",
                      bgcolor: "rgba(255,255,255,0.96)",
                      width: "100%",
                      maxWidth: "100%",
                      minWidth: 1180,
                      minHeight: 0,
                      maxHeight: { xs: "min(72vh, 640px)", md: "min(70vh, 720px)" },
                      overflowY: "auto",
                      boxSizing: "border-box",
                      boxShadow: "0 1px 10px rgba(15, 23, 42, 0.04)",
                    }}
                  >
          <Box
            sx={{
              display: "grid",
              width: "100%",
              minWidth: 0,
              gridTemplateColumns: "220px repeat(7, minmax(88px, 1fr))",
              bgcolor: CAL_HEADER_BG,
              color: "#fff",
            }}
          >
            <Box sx={{ px: 1, py: 0.65 }}>
              <Typography sx={{ fontSize: "0.72rem", color: "#fff", fontWeight: 800, letterSpacing: "0.02em" }}>
                NĂM {weekDays[0]?.date?.getFullYear()}
              </Typography>
            </Box>
            {weekDays.map((day) => (
              <Box
                key={`head-${day.dateYmd}`}
                sx={{
                  px: 0.85,
                  py: 0.65,
                  borderLeft: CAL_GRID_HEADER_COL,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography sx={{ fontSize: "0.72rem", fontWeight: 600, textAlign: "center", color: "#fff", width: "100%" }}>
                  {day.dayLabel}
                </Typography>
              </Box>
            ))}
          </Box>

          <Box
            sx={{
              display: "grid",
              width: "100%",
              minWidth: 0,
              gridTemplateColumns: "220px repeat(7, minmax(88px, 1fr))",
              bgcolor: CAL_HEADER_BG,
              color: "#fff",
              borderTop: "1px solid rgba(255,255,255,0.28)",
              borderBottom: "1px solid rgba(148,163,184,0.35)",
            }}
          >
            <Box sx={{ px: 1, py: 0.6 }}>
              <Typography sx={{ fontSize: "0.72rem", color: "#fff", fontWeight: 600 }}>TUẦN</Typography>
            </Box>
            {weekDays.map((day) => (
              <Box
                key={`date-${day.dateYmd}`}
                sx={{
                  px: 0.85,
                  py: 0.6,
                  borderLeft: CAL_GRID_HEADER_COL,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography sx={{ fontSize: "0.72rem", fontWeight: 500, textAlign: "center", color: "#fff", width: "100%" }}>
                  {formatDateVi(day.date).slice(0, 5)}
                </Typography>
              </Box>
            ))}
          </Box>

          {(() => {
            const { morning, afternoon } = slotWindowsBySession;
            const blocks = [];

            const pushSlotRow = (win, rowIdx) => {
              const session = detectSessionKey(win.startTime);
              const stripBg = session === "MORNING" ? "#fef3c7" : "#dbeafe";
              const rowBg = rowIdx % 2 === 0 ? "rgba(255, 255, 255, 0.98)" : "rgba(248, 250, 252, 0.94)";
              blocks.push(
                <Box
                  key={win.key}
                  sx={{
                    display: "grid",
                    width: "100%",
                    minWidth: 0,
                    gridTemplateColumns: "220px repeat(7, minmax(88px, 1fr))",
                    borderBottom: CAL_GRID_LINE_ROW,
                    bgcolor: rowBg,
                  }}
                >
                  <Box
                    sx={{
                      minHeight: 44,
                      bgcolor: stripBg,
                      borderRight: CAL_GRID_LINE_COL,
                      px: 1,
                      py: 0.65,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      gap: 0.15,
                    }}
                  >
                    <Typography
                      sx={{ fontSize: "0.78rem", fontWeight: 800, color: "#1e293b", fontVariantNumeric: "tabular-nums" }}
                    >
                      {win.startTime} – {win.endTime}
                    </Typography>
                    <Typography sx={{ fontSize: "0.65rem", fontWeight: 600, color: "#64748b" }}>
                      {session === "MORNING" ? "Ca sáng" : "Ca chiều"}
                    </Typography>
                  </Box>
                  {weekDays.map((day) => {
                    const cellKey = `${day.dateYmd}|${win.startTime}|${win.endTime}`;
                    const slots = slotsByDayAndWindow.get(cellKey) || [];
                    return (
                      <Box
                        key={`${win.key}-${day.dateYmd}`}
                        sx={{
                          px: 0.75,
                          py: 0.5,
                          borderLeft: CAL_GRID_LINE_COL,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minHeight: 44,
                        }}
                      >
                        {slots.length === 0 ? (
                          <Box sx={{ minHeight: 22, width: "100%" }} aria-hidden />
                        ) : (
                          <Stack spacing={0.45} alignItems="center" sx={{ width: "100%", py: 0.15 }}>
                            {slots.map((slot, slotIdx) => {
                              const hasOffline = hasOfflineAppointment(slot);
                              const detail = hasOffline ? pickFirstOfflineAppointment(slot) : null;
                              const offlineStatus = detail?.status;
                              const label = hasOffline
                                ? String(offlineStatus || "")
                                        .toUpperCase()
                                        .includes("CONFIRM")
                                  ? "Có lịch hẹn"
                                  : consultationStatusLabel(offlineStatus)
                                : slot.statusLabel || slot.status;
                              const baseSx = calendarSlotChipSx(slot.status, slot.statusLabel);
                              const statusSx =
                                hasOffline && String(offlineStatus || "").toUpperCase().includes("CONFIRM")
                                  ? {
                                      bgcolor: "rgba(192,132,252,0.16)",
                                      color: "#7c3aed",
                                      border: "1px solid rgba(124,58,237,0.45)",
                                      fontWeight: 700,
                                    }
                                  : hasOffline
                                  ? consultationStatusChipSx(offlineStatus)
                                  : {};
                              const color =
                                !hasOffline && !slotLooksCompleted(slot.status, slot.statusLabel)
                                  ? STATUS_COLOR[slot.status] || "default"
                                  : undefined;
                              return (
                                <Chip
                                  key={`${cellKey}-${slotIdx}-${slot.status}`}
                                  label={label}
                                  color={color}
                                  size="small"
                                  onClick={() => {
                                    if (!hasOffline || !detail) return;
                                    setSelectedAppointment({
                                      ...detail,
                                      slotDate: slot.date,
                                      slotTime: `${slot.startTime} - ${slot.endTime}`,
                                      counsellorSlotId: slot.counsellorSlotId,
                                    });
                                    setAppointmentFlowStep(consultationIsInProgress(detail?.status) ? "in_progress" : "initial");
                                    setCompletionNote("");
                                  }}
                                  sx={{
                                    ...baseSx,
                                    ...statusSx,
                                    ...(hasOffline
                                      ? {
                                          cursor: "pointer",
                                        }
                                      : null),
                                  }}
                                />
                              );
                            })}
                          </Stack>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              );
            };

            const pushEmptySessionRow = (sessionKey, rowIdx) => {
              const stripBg = sessionKey === "MORNING" ? "#fef3c7" : "#dbeafe";
              const rowBg = rowIdx % 2 === 0 ? "rgba(255, 255, 255, 0.98)" : "rgba(248, 250, 252, 0.94)";
              const label = sessionKey === "MORNING" ? "Ca sáng" : "Ca chiều";
              blocks.push(
                <Box
                  key={`empty-session-${sessionKey}`}
                  sx={{
                    display: "grid",
                    width: "100%",
                    minWidth: 0,
                    gridTemplateColumns: "220px repeat(7, minmax(88px, 1fr))",
                    borderBottom: CAL_GRID_LINE_ROW,
                    bgcolor: rowBg,
                  }}
                >
                  <Box
                    sx={{
                      minHeight: 44,
                      bgcolor: stripBg,
                      borderRight: CAL_GRID_LINE_COL,
                      px: 1,
                      py: 0.65,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      gap: 0.15,
                    }}
                  >
                    <Typography sx={{ fontSize: "0.78rem", fontWeight: 800, color: "#1e293b" }}>{label}</Typography>
                    <Typography sx={{ fontSize: "0.65rem", fontWeight: 600, color: "#94a3b8", fontStyle: "italic" }}>
                      Chưa có slot
                    </Typography>
                  </Box>
                  {weekDays.map((day) => (
                    <Box
                      key={`${sessionKey}-empty-${day.dateYmd}`}
                      sx={{
                        px: 0.75,
                        py: 0.5,
                        borderLeft: CAL_GRID_LINE_COL,
                        minHeight: 44,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Box sx={{ minHeight: 22, width: "100%" }} aria-hidden />
                    </Box>
                  ))}
                </Box>
              );
            };

            let rowIdx = 0;
            morning.forEach((win) => {
              pushSlotRow(win, rowIdx);
              rowIdx += 1;
            });
            if (morning.length === 0) {
              pushEmptySessionRow("MORNING", rowIdx);
              rowIdx += 1;
            }
            afternoon.forEach((win) => {
              pushSlotRow(win, rowIdx);
              rowIdx += 1;
            });
            if (afternoon.length === 0) {
              pushEmptySessionRow("AFTERNOON", rowIdx);
              rowIdx += 1;
            }

            return blocks;
          })()}
                  </Box>
                </Box>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Box>
      <Dialog
        open={Boolean(selectedAppointment)}
        onClose={() => {
          if (actionLoading) return;
          setSelectedAppointment(null);
          setAppointmentFlowStep("initial");
          setCompletionNote("");
        }}
        maxWidth="sm"
        fullWidth
        scroll="paper"
        PaperProps={detailDialogPaperProps}
      >
        <DialogTitle sx={{ p: 0, bgcolor: "transparent" }}>
          <Box
            sx={{
              px: 2.5,
              py: 2,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 2,
              background: detailModalSx.headerBar,
              borderBottom: "1px solid #9ec9e8",
            }}
          >
            <Stack direction="row" spacing={1.75} alignItems="flex-start" sx={{ minWidth: 0, flex: 1 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: "rgba(13, 71, 161, 0.1)",
                  border: "1px solid rgba(13, 71, 161, 0.18)",
                }}
              >
                <EventAvailableOutlinedIcon sx={{ fontSize: 24, color: detailModalSx.titleColor }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: { xs: 18, sm: 20 }, fontWeight: 800, color: detailModalSx.titleColor }}>
                  Chi tiết cuộc hẹn
                </Typography>
                <Typography sx={{ mt: 0.5, fontSize: 13.5, fontWeight: 500, color: "#455a64" }}>
                  Thông tin phụ huynh đăng ký lịch tư vấn
                </Typography>
              </Box>
            </Stack>
            <IconButton
              size="small"
              onClick={() => {
                if (actionLoading) return;
                setSelectedAppointment(null);
                setAppointmentFlowStep("initial");
                setCompletionNote("");
              }}
              aria-label="Đóng"
              sx={{
                color: detailModalSx.titleColor,
                flexShrink: 0,
                bgcolor: "rgba(255,255,255,0.65)",
                border: "1px solid #b0cfe8",
                "&:hover": { bgcolor: "#fff" },
              }}
            >
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0, bgcolor: detailModalSx.pageBg }}>
          {selectedAppointment ? (
            <Box sx={{ px: { xs: 2.25, sm: 2.75 }, pt: { xs: 2, sm: 2.25 }, pb: 2.25 }}>
              <Stack spacing={2}>
                <DetailSection title="Thông tin phụ huynh" icon={<PersonOutlineOutlinedIcon sx={{ fontSize: 22 }} />}>
                  <Stack spacing={1.1}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: detailModalSx.labelColor }}>Họ và tên</Typography>
                    <Typography sx={{ fontSize: 15, fontWeight: 600, color: detailModalSx.valueColor }}>
                      {String(selectedAppointment.parentName || "—").trim() || "—"}
                    </Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: detailModalSx.labelColor }}>Số điện thoại</Typography>
                    <Typography sx={{ fontSize: 15, fontWeight: 600, color: detailModalSx.valueColor }}>
                      {String(selectedAppointment.phone || "—").trim() || "—"}
                    </Typography>
                  </Stack>
                </DetailSection>
                <DetailSection title="Nội dung tư vấn" icon={<StickyNote2OutlinedIcon sx={{ fontSize: 22 }} />}>
                  <Stack spacing={1.1}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: detailModalSx.labelColor }}>Câu hỏi</Typography>
                    <Typography sx={{ fontSize: 15, fontWeight: 500, color: detailModalSx.valueColor, whiteSpace: "pre-wrap" }}>
                      {String(selectedAppointment.question || "—").trim() || "—"}
                    </Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: detailModalSx.labelColor }}>Trạng thái</Typography>
                    <Box>
                      <Chip
                        size="small"
                        label={consultationStatusLabel(selectedAppointment.status)}
                        sx={consultationStatusChipSx(selectedAppointment.status)}
                      />
                    </Box>
                  </Stack>
                </DetailSection>
                {appointmentFlowStep === "complete_form" ? (
                  <DetailSection title="Ghi chú buổi tư vấn" icon={<StickyNote2OutlinedIcon sx={{ fontSize: 22 }} />}>
                    <Stack spacing={1.1}>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: detailModalSx.labelColor }}>Nội dung ghi chú</Typography>
                      <TextField
                        value={completionNote}
                        onChange={(e) => setCompletionNote(e.target.value)}
                        disabled={actionLoading}
                        multiline
                        minRows={3}
                        placeholder="Nhập ghi chú sau buổi tư vấn..."
                        fullWidth
                        sx={{ "& .MuiOutlinedInput-root": { bgcolor: "#fff", borderRadius: 2 } }}
                      />
                    </Stack>
                  </DetailSection>
                ) : null}
              </Stack>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions
          sx={{
            px: { xs: 2.25, sm: 2.75 },
            py: 2,
            bgcolor: "#f5fafd",
            borderTop: "1px solid #b0cfe8",
            justifyContent: "flex-end",
          }}
        >
          {selectedAppointment ? (
            (() => {
              const isInProgress = consultationIsInProgress(selectedAppointment.status);
              const isDone = consultationIsDone(selectedAppointment.status);
              const callUpdateAction = async (action, noteValue = "") => {
                const id = Number(selectedAppointment?.id);
                const counsellorSlotId = Number(selectedAppointment?.counsellorSlotId);
                const appointmentDate = String(selectedAppointment?.appointmentDate || selectedAppointment?.slotDate || "").slice(0, 10);
                if (!Number.isFinite(id) || id <= 0 || !appointmentDate || !Number.isFinite(counsellorSlotId) || counsellorSlotId <= 0) {
                  enqueueSnackbar("Thiếu dữ liệu cuộc hẹn để cập nhật trạng thái.", { variant: "warning" });
                  return;
                }
                setActionLoading(true);
                try {
                  const res = await putCounsellorOfflineConsultation({
                    id,
                    appointmentDate,
                    note: String(noteValue ?? ""),
                    cancelReason: "",
                    counsellorSlotId,
                    action,
                  });
                  const msg = String(res?.data?.message || "").trim();
                  enqueueSnackbar(msg || "Cập nhật lịch tư vấn thành công.", { variant: "success" });
                  setSelectedAppointment(null);
                  setAppointmentFlowStep("initial");
                  setCompletionNote("");
                  await loadCalendar();
                } catch (e) {
                  const msg =
                    e?.response?.data?.message || e?.response?.data?.error || e?.message || "Không thể cập nhật lịch tư vấn.";
                  enqueueSnackbar(String(msg), { variant: "error" });
                } finally {
                  setActionLoading(false);
                }
              };
              if (isDone) return null;
              if (!isInProgress) {
                return (
                  <>
                    <Button
                      variant="outlined"
                      disabled={actionLoading}
                      onClick={() => void callUpdateAction("no_show")}
                      sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, px: 2.4, minWidth: 120 }}
                    >
                      Vắng mặt
                    </Button>
                    <Button
                      variant="contained"
                      disabled={actionLoading}
                      onClick={() => void callUpdateAction("start")}
                      sx={{
                        textTransform: "none",
                        fontWeight: 700,
                        borderRadius: 2,
                        px: 3,
                        minWidth: 120,
                        bgcolor: "#1565c0",
                        boxShadow: "0 4px 14px rgba(21, 101, 160, 0.35)",
                        "&:hover": { bgcolor: "#0d47a1", boxShadow: "0 6px 18px rgba(13, 71, 161, 0.38)" },
                      }}
                    >
                      Bắt đầu
                    </Button>
                  </>
                );
              }
              if (appointmentFlowStep !== "complete_form") {
                return (
                  <Button
                    variant="contained"
                    disabled={actionLoading}
                    onClick={() => setAppointmentFlowStep("complete_form")}
                    sx={{
                      textTransform: "none",
                      fontWeight: 700,
                      borderRadius: 2,
                      px: 3,
                      minWidth: 120,
                      bgcolor: "#1565c0",
                      boxShadow: "0 4px 14px rgba(21, 101, 160, 0.35)",
                      "&:hover": { bgcolor: "#0d47a1", boxShadow: "0 6px 18px rgba(13, 71, 161, 0.38)" },
                    }}
                  >
                    Kết thúc
                  </Button>
                );
              }
              return (
                <Button
                  variant="contained"
                  disabled={actionLoading}
                  onClick={() => void callUpdateAction("end", completionNote)}
                  sx={{
                    textTransform: "none",
                    fontWeight: 700,
                    borderRadius: 2,
                    px: 3,
                    minWidth: 120,
                    bgcolor: "#16a34a",
                    boxShadow: "0 4px 14px rgba(22, 163, 74, 0.32)",
                    "&:hover": { bgcolor: "#15803d", boxShadow: "0 6px 18px rgba(21, 128, 61, 0.36)" },
                  }}
                >
                  Hoàn thành
                </Button>
              );
            })()
          ) : null}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
