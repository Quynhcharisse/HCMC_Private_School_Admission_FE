import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, alpha, Avatar, Box, Button, Card, CardContent, Chip, CircularProgress, Stack, Typography } from "@mui/material";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import TodayIcon from "@mui/icons-material/Today";
import { enqueueSnackbar } from "notistack";
import { getCounsellorCalendar, parseCounsellorCalendarBody } from "../../../services/CounsellorCalendarService.jsx";
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

/** Một hàng lưới = một khung giờ (start–end), gom mọi ngày trong tuần có slot trùng khung. */
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

  /** Các khung giờ duy nhất trong tuần, sắp theo thời gian — mỗi phần tử là một hàng lưới. */
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

  /** Ô (ngày, start, end) → danh sách slot (có thể >1 nếu BE tách bản ghi). */
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
                            {slots.map((slot, slotIdx) => (
                              <Chip
                                key={`${cellKey}-${slotIdx}-${slot.status}`}
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
    </Box>
  );
}
