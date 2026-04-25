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

const STATUS_COLOR = {
  UPCOMING: "info",
  ONGOING: "success",
  COMPLETED: "default",
  CANCELLED: "error",
};
const MIN_RENDER_ROWS = 10;

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
const sessionColors = {
  MORNING: {
    strip: "#fef3c7",
    row: "rgba(254, 243, 199, 0.26)",
  },
  AFTERNOON: {
    strip: "#dbeafe",
    row: "rgba(219, 234, 254, 0.26)",
  },
};

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

const stripKey = (sessionKey) => sessionColors[sessionKey]?.strip || sessionColors.AFTERNOON.strip;
const rowBg = (sessionKey) => sessionColors[sessionKey]?.row || sessionColors.AFTERNOON.row;

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

  const timeRows = useMemo(() => {
    const keyMap = new Map();
    calendarRows.forEach((row) => {
      const startTime = normalizeTime(row?.startTime);
      const endTime = normalizeTime(row?.endTime);
      if (!startTime || !endTime) return;
      const key = `${startTime}-${endTime}`;
      if (!keyMap.has(key)) {
        keyMap.set(key, {
          key,
          startTime,
          endTime,
          sortValue: startTime,
          sessionKey: detectSessionKey(startTime),
        });
      }
    });
    return Array.from(keyMap.values()).sort((a, b) => a.sortValue.localeCompare(b.sortValue));
  }, [calendarRows]);

  const displayRows = useMemo(() => {
    if (timeRows.length >= MIN_RENDER_ROWS) return timeRows;
    const fillers = Array.from({ length: MIN_RENDER_ROWS - timeRows.length }, (_, idx) => ({
      key: `empty-${idx + 1}`,
      startTime: "",
      endTime: "",
      isEmpty: true,
      sessionKey: idx < Math.ceil((MIN_RENDER_ROWS - timeRows.length) / 2) ? "MORNING" : "AFTERNOON",
    }));
    return [...timeRows, ...fillers];
  }, [timeRows]);

  const slotByCell = useMemo(() => {
    const map = new Map();
    calendarRows.forEach((slot) => {
      const date = String(slot?.date || "").slice(0, 10);
      const startTime = normalizeTime(slot?.startTime);
      const endTime = normalizeTime(slot?.endTime);
      if (!date || !startTime || !endTime) return;
      const rowKey = `${startTime}-${endTime}`;
      map.set(`${date}|${rowKey}`, slot);
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
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, color: "#1e293b", mb: 0.5 }}>
        Lịch tư vấn
      </Typography>
      <Typography variant="body2" sx={{ color: "#64748b", mb: 2.5 }}>
        Theo dõi lịch làm việc theo tuần của tư vấn viên.
      </Typography>

      <Card
        sx={{
          borderRadius: 3,
          border: "1px solid rgba(148,163,184,0.28)",
          boxShadow: "0 10px 28px rgba(15, 23, 42, 0.08)",
          backgroundImage: "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(241,245,249,0.96) 100%)",
          mb: 2,
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
                    borderColor: "rgba(37,99,235,0.55)",
                    bgcolor: "rgba(37,99,235,0.08)",
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
                    borderColor: "rgba(37,99,235,0.55)",
                    bgcolor: "rgba(37,99,235,0.08)",
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
                  boxShadow: "0 8px 18px rgba(37,99,235,0.28)",
                  bgcolor: "#2563eb",
                  "&:hover": {
                    bgcolor: "#1d4ed8",
                    boxShadow: "0 10px 22px rgba(29,78,216,0.34)",
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
                border: "1px solid rgba(37,99,235,0.25)",
                bgcolor: "rgba(239,246,255,0.95)",
              }}
            >
              <Typography sx={{ fontWeight: 700, color: "#1e3a8a", fontSize: "0.9rem", letterSpacing: "0.01em" }}>
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
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ width: "100%", overflowX: "auto", pb: 0.5 }}>
          <Box
            sx={{
              border: "1px solid rgba(59,130,246,0.24)",
              borderRadius: 2.5,
              overflow: "hidden",
              bgcolor: "#fff",
              width: "100%",
              minWidth: 980,
              boxShadow: "0 14px 35px rgba(51,65,85,0.12)",
              backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)",
            }}
          >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "190px repeat(7, minmax(64px, 1fr))",
              bgcolor: "#5e81c6",
              color: "#fff",
            }}
          >
            <Box sx={{ px: 0.8, py: 0.5 }}>
              <Typography sx={{ fontSize: "0.72rem", color: "#fff", fontWeight: 800, letterSpacing: "0.02em" }}>
                NĂM {weekDays[0]?.date?.getFullYear()}
              </Typography>
            </Box>
            {weekDays.map((day) => (
              <Box
                key={`head-${day.dateYmd}`}
                sx={{
                  px: 0.7,
                  py: 0.45,
                  borderLeft: "1px solid rgba(255,255,255,0.55)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography sx={{ fontSize: "0.72rem", fontWeight: 600, textAlign: "center" }}>{day.dayLabel}</Typography>
              </Box>
            ))}
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "190px repeat(7, minmax(64px, 1fr))",
              bgcolor: "#5e81c6",
              color: "#fff",
              borderTop: "1px solid rgba(255,255,255,0.28)",
              borderBottom: "1px solid rgba(148,163,184,0.35)",
            }}
          >
            <Box sx={{ px: 0.8, py: 0.45 }}>
              <Typography sx={{ fontSize: "0.72rem", color: "#fff", fontWeight: 700 }}>TUẦN</Typography>
            </Box>
            {weekDays.map((day) => (
              <Box
                key={`date-${day.dateYmd}`}
                sx={{
                  px: 0.7,
                  py: 0.45,
                  borderLeft: "1px solid rgba(255,255,255,0.55)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography sx={{ fontSize: "0.72rem", fontWeight: 500, textAlign: "center" }}>
                  {formatDateVi(day.date).slice(0, 5)}
                </Typography>
              </Box>
            ))}
          </Box>

          {displayRows.map((row, idx) => (
            <Box
              key={row.key}
              sx={{
                display: "grid",
                gridTemplateColumns: "190px repeat(7, minmax(64px, 1fr))",
                borderBottom: "1px solid rgba(100, 116, 139, 0.36)",
                bgcolor: rowBg(row.sessionKey),
              }}
            >
              <Box
                sx={{
                  minHeight: 34,
                  bgcolor: stripKey(row.sessionKey),
                  borderRight: "1px solid rgba(100, 116, 139, 0.32)",
                  px: 1,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: "#334155" }}>
                  {row.startTime && row.endTime ? `${row.startTime} - ${row.endTime}` : " "}
                </Typography>
              </Box>

              {weekDays.map((day) => {
                const slot = slotByCell.get(`${day.dateYmd}|${row.key}`);
                return (
                  <Box
                    key={`${row.key}-${day.dateYmd}`}
                    sx={{
                      px: 0.25,
                      py: 0.25,
                      borderLeft: "1px solid rgba(100, 116, 139, 0.32)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: 34,
                    }}
                  >
                    {slot ? (
                      <Chip
                        label={slot.statusLabel || slot.status}
                        color={STATUS_COLOR[slot.status] || "default"}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          borderRadius: "8px",
                          boxShadow: "0 3px 10px rgba(15,23,42,0.12)",
                        }}
                      />
                    ) : (
                      <Typography sx={{ fontSize: "0.78rem", color: "#64748b" }}>-</Typography>
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
