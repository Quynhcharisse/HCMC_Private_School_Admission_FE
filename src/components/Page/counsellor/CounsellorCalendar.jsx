import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Stack, Typography } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import TodayIcon from "@mui/icons-material/Today";
import { enqueueSnackbar } from "notistack";
import { getCounsellorCalendar, parseCounsellorCalendarBody } from "../../../services/CounsellorCalendarService.jsx";

const CALENDAR_DAYS = [
  { key: "MON", label: "Th 2", offset: 0 },
  { key: "TUE", label: "Th 3", offset: 1 },
  { key: "WED", label: "Th 4", offset: 2 },
  { key: "THU", label: "Th 5", offset: 3 },
  { key: "FRI", label: "Th 6", offset: 4 },
  { key: "SAT", label: "Th 7", offset: 5 },
  { key: "SUN", label: "CN", offset: 6 },
];

const CAL_HEADER_BG = "#6c8fcf";
const CAL_CARD_BORDER = "1px solid rgba(59,130,246,0.22)";
const CAL_GRID_LINE_ROW = "1px solid rgba(100, 116, 139, 0.36)";
const CAL_GRID_LINE_COL = "1px solid rgba(100, 116, 139, 0.32)";
const CAL_GRID_HEADER_COL = "1px solid rgba(255, 255, 255, 0.55)";
const CAL_BRAND = "#6c8fcf";
const CAL_BRAND_HOVER = "#5a7ab5";

const STATUS_COLOR = {
  UPCOMING: "info",
  ONGOING: "success",
  COMPLETED: "default",
  CANCELLED: "error",
};

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
    boxShadow: "0 3px 10px rgba(15,23,42,0.12)",
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

const SESSION_DISPLAY_ROWS = [
  { sessionKey: "MORNING", label: "Ca sáng", stripBg: "#fef3c7", rowBg: "rgba(254, 243, 199, 0.35)" },
  { sessionKey: "AFTERNOON", label: "Ca chiều", stripBg: "#dbeafe", rowBg: "rgba(219, 234, 254, 0.35)" },
];

export default function CounsellorCalendar() {
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [calendarRows, setCalendarRows] = useState([]);

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

  const slotsByDayAndSession = useMemo(() => {
    const map = new Map();
    const seen = new Set();
    calendarRows.forEach((slot) => {
      const date = String(slot?.date || "").slice(0, 10);
      const startTime = normalizeTime(slot?.startTime);
      const endTime = normalizeTime(slot?.endTime);
      if (!date || !startTime || !endTime) return;
      const status = String(slot?.status || "").toUpperCase();
      const dedupKey = `${date}|${startTime}|${endTime}|${status}`;
      if (seen.has(dedupKey)) return;
      seen.add(dedupKey);
      const sessionKey = detectSessionKey(startTime);
      const cellKey = `${date}|${sessionKey}`;
      if (!map.has(cellKey)) map.set(cellKey, []);
      map.get(cellKey).push(slot);
    });
    map.forEach((arr) => {
      arr.sort((a, b) => normalizeTime(a.startTime).localeCompare(normalizeTime(b.startTime)));
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
          dedupMap.set(key, {
            date,
            dayOfWeek: String(item?.dayOfWeek || "").toUpperCase(),
            startTime,
            endTime,
            status: status || "UPCOMING",
            statusLabel: item?.statusLabel || "Sắp diễn ra",
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
    <Box sx={{ width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box" }}>
      <Typography variant="h5" sx={{ fontWeight: 700, color: "#1e293b", mb: 0.5 }}>
        Lịch tư vấn trực tiếp
      </Typography>
      <Typography variant="body2" sx={{ color: "#64748b", mb: 2.5 }}>
        Theo dõi lịch làm việc theo tuần của tư vấn viên.
      </Typography>

      <Card
        sx={{
          borderRadius: 3,
          border: CAL_CARD_BORDER,
          boxShadow: "0 4px 20px rgba(51,65,85,0.06)",
          bgcolor: "rgba(255,255,255,0.98)",
          mb: 2,
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
        }}
      >
        <CardContent sx={{ p: 2.2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5}>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<ChevronLeftIcon />}
                onClick={() => setAnchorDate((prev) => addDays(prev, -7))}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  borderRadius: "12px",
                  borderColor: "rgba(100,116,139,0.35)",
                  color: "#334155",
                  px: 1.8,
                  "&:hover": {
                    borderColor: "rgba(108,143,207,0.65)",
                    bgcolor: "rgba(108,143,207,0.1)",
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
                  borderColor: "rgba(100,116,139,0.35)",
                  color: "#334155",
                  px: 1.8,
                  "&:hover": {
                    borderColor: "rgba(108,143,207,0.65)",
                    bgcolor: "rgba(108,143,207,0.1)",
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
                  boxShadow: "0 8px 18px rgba(108,143,207,0.35)",
                  bgcolor: CAL_BRAND,
                  "&:hover": {
                    bgcolor: CAL_BRAND_HOVER,
                    boxShadow: "0 10px 22px rgba(90,122,181,0.38)",
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
                border: "1px solid rgba(108,143,207,0.42)",
                bgcolor: "rgba(108,143,207,0.12)",
              }}
            >
              <Typography sx={{ fontWeight: 700, color: CAL_BRAND, fontSize: "0.9rem", letterSpacing: "0.01em" }}>
                {weekRangeLabel}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

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
              bgcolor: "#fff",
              width: "100%",
              maxWidth: "100%",
              minWidth: 1180,
              minHeight: 0,
              boxSizing: "border-box",
              boxShadow: "0 4px 20px rgba(51,65,85,0.06)",
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

          {SESSION_DISPLAY_ROWS.map((shift) => (
            <Box
              key={shift.sessionKey}
              sx={{
                display: "grid",
                width: "100%",
                minWidth: 0,
                gridTemplateColumns: "220px repeat(7, minmax(88px, 1fr))",
                borderBottom: CAL_GRID_LINE_ROW,
                bgcolor: shift.rowBg,
              }}
            >
              <Box
                sx={{
                  minHeight: 36,
                  bgcolor: shift.stripBg,
                  borderRight: CAL_GRID_LINE_COL,
                  px: 1,
                  py: 0.5,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#334155" }}>{shift.label}</Typography>
              </Box>
              {weekDays.map((day) => {
                const cellKey = `${day.dateYmd}|${shift.sessionKey}`;
                const slots = slotsByDayAndSession.get(cellKey) || [];
                return (
                  <Box
                    key={`${shift.sessionKey}-${day.dateYmd}`}
                    sx={{
                      px: 0.75,
                      py: 0.5,
                      borderLeft: CAL_GRID_LINE_COL,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: 36,
                    }}
                  >
                    {slots.length === 0 ? (
                      <Box sx={{ minHeight: 24, width: "100%" }} aria-hidden />
                    ) : (
                      <Stack spacing={0.45} alignItems="center" sx={{ width: "100%", py: 0.15 }}>
                        {slots.map((slot, slotIdx) => (
                          <Chip
                            key={`${cellKey}-${slotIdx}-${slot.startTime}-${slot.endTime}`}
                            label={slot.statusLabel || slot.status}
                            color={
                              slotLooksCompleted(slot.status, slot.statusLabel)
                                ? undefined
                                : STATUS_COLOR[slot.status] || "default"
                            }
                            size="small"
                            sx={calendarSlotChipSx(slot.status, slot.statusLabel)}
                          />
                        ))}
                      </Stack>
                    )}
                  </Box>
                );
              })}
            </Box>
          ))}
        </Box>
        </Box>
      )}
    </Box>
  );
}
