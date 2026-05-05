import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  alpha,
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Pagination,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tab,
  Tabs,
  Tooltip,
  Typography,
  Button,
} from "@mui/material";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import StickyNote2OutlinedIcon from "@mui/icons-material/StickyNote2Outlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import TodayIcon from "@mui/icons-material/Today";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import { enqueueSnackbar } from "notistack";
import {
  COUNSELLOR_OFFLINE_CONSULTATION_STATUSES,
  COUNSELLOR_OFFLINE_TAB_LABELS,
  getCounsellorOfflineConsultations,
  parseCounsellorOfflineConsultationsResponse,
  putCounsellorOfflineConsultation,
} from "../../../services/CounsellorOfflineConsultationService.jsx";
import {
  getCounsellorSlots,
  getCounsellorsForAppointment,
  parseCounsellorSlotsBody,
  parseCounsellorsForAppointmentBody,
} from "../../../services/CounsellorSlotService.jsx";
import {
  counsellorGradientHeaderCardSx,
  counsellorInnerCardSx,
  counsellorShellOuterSx,
} from "./counsellorShellSx.js";
import {
  adminSttChipSx,
  adminTableBodyRowSx,
  adminTableContainerSx,
  adminTableHeadCellSx,
  adminTableHeadRowSx,
} from "../../../constants/adminTableStyles.js";

const counsellorDetailModalSx = {
  pageBg: "#e8f4fc",
  sectionBorder: "1px solid #b0cfe8",
  sectionInnerBg: "rgba(255,255,255,0.72)",
  labelColor: "#1565c0",
  titleColor: "#0d47a1",
  valueColor: "#1e293b",
  fieldBorder: "1px solid #cfe8f8",
  headerBar: "linear-gradient(180deg, #dceef9 0%, #c9e3f5 100%)",
};

const counsellorDialogPaperProps = {
  elevation: 0,
  sx: {
    borderRadius: 2.5,
    overflow: "hidden",
    border: "1px solid #9ec9e8",
    boxShadow: "0 20px 45px -12px rgba(13, 71, 161, 0.18)",
  },
};

function CounsellorModalSection({ title, icon, children }) {
  return (
    <Box
      sx={{
        border: counsellorDetailModalSx.sectionBorder,
        borderRadius: 2.5,
        p: 2,
        bgcolor: counsellorDetailModalSx.sectionInnerBg,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.75 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "rgba(21, 101, 160, 0.12)",
            color: counsellorDetailModalSx.titleColor,
          }}
        >
          {icon}
        </Box>
        <Typography
          sx={{
            fontSize: 17,
            fontWeight: 800,
            color: counsellorDetailModalSx.titleColor,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </Typography>
      </Stack>
      {children}
    </Box>
  );
}

function CounsellorDetailField({ label, value, multiline, grid = 12, emptyLabel = "—", statusChipFromRow }) {
  const fieldBoxSx = {
    bgcolor: "#fff",
    border: counsellorDetailModalSx.fieldBorder,
    borderRadius: 2,
    p: 1.75,
    height: "100%",
  };

  if (statusChipFromRow) {
    return (
      <Grid size={{ xs: 12, sm: grid }}>
        <Box sx={fieldBoxSx}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: counsellorDetailModalSx.labelColor, mb: 0.5 }}>
            {label}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 0.75, pt: 0.25 }}>
            {statusTag(statusChipFromRow)}
          </Box>
        </Box>
      </Grid>
    );
  }

  const raw = value != null && String(value).trim() !== "" ? String(value).trim() : "";
  const show = raw || emptyLabel;
  return (
    <Grid size={{ xs: 12, sm: grid }}>
      <Box sx={fieldBoxSx}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: counsellorDetailModalSx.labelColor, mb: 0.5 }}>
          {label}
        </Typography>
        <Typography
          sx={{
            fontSize: 15,
            fontWeight: 500,
            color: counsellorDetailModalSx.valueColor,
            lineHeight: 1.55,
            whiteSpace: multiline ? "pre-wrap" : "normal",
            wordBreak: "break-word",
          }}
        >
          {show}
        </Typography>
      </Box>
    </Grid>
  );
}

const PAGE_SIZE = 10;

const statusChipTableSx = {
  maxWidth: "none",
  height: "auto",
  fontWeight: 600,
  "& .MuiChip-label": {
    whiteSpace: "normal",
    lineHeight: 1.3,
    overflow: "visible",
    textOverflow: "clip",
    py: 0.25,
  },
};

const viewActionSx = {
  color: "#38bdf8",
  "&:hover": { bgcolor: "rgba(56, 189, 248, 0.12)", color: "#0ea5e9" },
};

const tableDenseSx = {
  "& .MuiTableCell-root": { px: 1, py: 0.65 },
};

function statusTag(row) {
  const s = String(row?.status || "CONSULTATION_PENDING").toUpperCase();
  if (s.includes("PENDING")) {
    return (
      <Chip
        size="small"
        label="Chờ xử lý"
        sx={{
          ...statusChipTableSx,
          bgcolor: "rgba(245,158,11,0.16)",
          color: "#fbbf24",
          border: "1px solid rgba(251,191,36,0.35)",
        }}
      />
    );
  }
  if (s.includes("CONFIRM")) {
    return (
      <Chip
        size="small"
        label="Đã xác nhận"
        sx={{
          ...statusChipTableSx,
          bgcolor: "rgba(16,185,129,0.16)",
          color: "#34d399",
          border: "1px solid rgba(52,211,153,0.35)",
        }}
      />
    );
  }
  if (s.includes("CANCEL")) {
    return (
      <Chip
        size="small"
        label="Đã hủy"
        sx={{
          ...statusChipTableSx,
          bgcolor: "rgba(239,68,68,0.16)",
          color: "#f87171",
          border: "1px solid rgba(248,113,113,0.35)",
        }}
      />
    );
  }
  if (s.includes("COMPLETE") || s.includes("COMPLETED")) {
    return (
      <Chip
        size="small"
        label="Hoàn tất"
        sx={{
          ...statusChipTableSx,
          bgcolor: "rgba(71,85,105,0.16)",
          color: "#475569",
          border: "1px solid rgba(71,85,105,0.28)",
        }}
      />
    );
  }
  const raw = String(row?.status || "—")
    .replace(/^CONSULTATION_/i, "")
    .replace(/_/g, " ")
    .trim();
  return (
    <Chip
      size="small"
      label={raw || "—"}
      sx={{
        ...statusChipTableSx,
        bgcolor: "rgba(148,163,184,0.2)",
        color: "#cbd5e1",
        border: "1px solid rgba(203,213,225,0.3)",
      }}
    />
  );
}

const formatAppointmentDate = (ymd) => {
  const s = String(ymd || "").trim();
  if (!s) return "";
  const parts = s.split("-").map((x) => Number(x));
  if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return s;
  const [y, m, d] = parts;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return s;
  return dt.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const formatAppointmentTime = (t) => {
  const s = String(t || "").trim();
  if (!s) return "";
  const seg = s.split(":");
  if (seg.length >= 2) {
    const hh = String(seg[0]).padStart(2, "0");
    const mm = String(seg[1]).padStart(2, "0");
    return `${hh}:${mm}`;
  }
  return s;
};

function formatAppointmentDateWithWeekday(ymd) {
  const s = String(ymd || "").trim().slice(0, 10);
  if (!s) return "";
  const parts = s.split("-").map((x) => Number(x));
  if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return s;
  const [y, m, d] = parts;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return s;
  const wd = dt.toLocaleDateString("vi-VN", { weekday: "long" });
  const cap = wd ? wd.charAt(0).toUpperCase() + wd.slice(1) : "";
  const dateVi = formatAppointmentDate(s);
  return cap && dateVi ? `${cap}, ${dateVi}` : dateVi || cap;
}

function isCounsellorBookingAvailable(c) {
  const raw = String(c?.bookingStatus ?? "").trim();
  if (!raw) return false;
  const lower = raw.toLowerCase();
  if (lower.includes("trống")) return true;
  const u = raw.toUpperCase();
  return ["AVAILABLE", "OPEN", "FREE", "EMPTY", "VACANT"].some((k) => u.includes(k));
}

const toTimeInputValue = (t) => {
  const s = String(t || "").trim();
  if (!s) return "";
  const seg = s.split(":");
  if (seg.length >= 2) {
    return `${String(seg[0]).padStart(2, "0")}:${String(seg[1]).padStart(2, "0")}`;
  }
  return "";
};

const timeInputToApi = (hhmm) => {
  const s = String(hhmm || "").trim();
  if (!s) return null;
  const seg = s.split(":");
  if (seg.length >= 2) {
    const hh = String(seg[0]).padStart(2, "0");
    const mm = String(seg[1]).padStart(2, "0");
    const ss = seg.length >= 3 ? String(seg[2]).padStart(2, "0") : "00";
    return `${hh}:${mm}:${ss}`;
  }
  return s;
};

function buildCounsellorQueryKey(appointmentDateYmd, timeInputHHmm) {
  const d = String(appointmentDateYmd || "").trim().slice(0, 10);
  const tApi = timeInputToApi(timeInputHHmm);
  if (!d || !tApi) return null;
  return `${d}|${tApi}`;
}

function parseCounsellorQueryKey(key) {
  if (key == null || typeof key !== "string") return null;
  const i = key.indexOf("|");
  if (i < 1) return null;
  const appointmentDate = key.slice(0, i).trim();
  const appointmentTime = key.slice(i + 1).trim();
  if (!appointmentDate || !appointmentTime) return null;
  return { appointmentDate, appointmentTime };
}

function toYmdLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function mondayOfWeekFromYmd(ymd) {
  const s = String(ymd || "").trim().slice(0, 10);
  if (!s) return null;
  const parts = s.split("-").map((x) => Number(x));
  if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const [y, mo, d] = parts;
  const dt = new Date(y, mo - 1, d);
  if (Number.isNaN(dt.getTime())) return null;
  const dow = dt.getDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  dt.setDate(dt.getDate() + diffToMon);
  return toYmdLocal(dt);
}

function sundayAfterMondayYmd(monYmd) {
  const parts = String(monYmd || "").split("-").map((x) => Number(x));
  if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const [y, mo, d] = parts;
  const dt = new Date(y, mo - 1, d + 6);
  if (Number.isNaN(dt.getTime())) return null;
  return toYmdLocal(dt);
}

function weekBoundsFromRow(row, fallbackYmd) {
  const start = String(row?.startDateOfWeek || "").trim().slice(0, 10);
  const end = String(row?.endDateOfWeek || "").trim().slice(0, 10);
  if (start && end) return { startDate: start, endDate: end };
  const base = String(fallbackYmd || row?.appointmentDate || "").trim().slice(0, 10);
  if (!base) return null;
  const mon = mondayOfWeekFromYmd(base);
  if (!mon) return null;
  const sun = sundayAfterMondayYmd(mon);
  if (!sun) return null;
  return { startDate: mon, endDate: sun };
}

function slotMatchesSelection(slot, appointmentDate, appointmentTimeInput) {
  const d = String(appointmentDate || "").trim().slice(0, 10);
  if (!d || String(slot?.date || "").slice(0, 10) !== d) return false;
  return toTimeInputValue(slot?.startTime) === String(appointmentTimeInput || "").trim();
}

function startMondayDate(date) {
  const value = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = value.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  value.setDate(value.getDate() + diff);
  return value;
}

function addCalendarDays(date, amount) {
  const v = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  v.setDate(v.getDate() + amount);
  return v;
}

function formatDateViEditModal(d) {
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function parseYmdToLocalDate(ymd) {
  const parts = String(ymd || "").trim().slice(0, 10).split("-").map(Number);
  if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const dt = new Date(parts[0], parts[1] - 1, parts[2]);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

const EDIT_MODAL_CAL_HEADER = "rgba(95, 125, 185, 0.9)";
const EDIT_MODAL_CAL_GRID_ROW = "1px solid rgba(100, 116, 139, 0.2)";
const EDIT_MODAL_CAL_GRID_COL = "1px solid rgba(100, 116, 139, 0.16)";
const EDIT_MODAL_CAL_GRID_HEAD_COL = "1px solid rgba(255, 255, 255, 0.35)";
const EDIT_MODAL_CAL_BRAND = "rgba(95, 125, 185, 0.95)";
const EDIT_MODAL_CAL_BRAND_HOVER = "rgba(84, 112, 168, 0.98)";

const EDIT_MODAL_WEEK_META = [
  { key: "MON", label: "Th 2", offset: 0 },
  { key: "TUE", label: "Th 3", offset: 1 },
  { key: "WED", label: "Th 4", offset: 2 },
  { key: "THU", label: "Th 5", offset: 3 },
  { key: "FRI", label: "Th 6", offset: 4 },
  { key: "SAT", label: "Th 7", offset: 5 },
  { key: "SUN", label: "CN", offset: 6 },
];

function normalizeSlotTimeForGrid(v) {
  return formatAppointmentTime(v);
}

function timeToMinutesForGrid(value) {
  const [h, m] = String(value || "")
    .split(":")
    .map((x) => Number(x));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function detectSessionForGrid(startTime) {
  const mins = timeToMinutesForGrid(startTime);
  if (!Number.isFinite(mins)) return "AFTERNOON";
  return mins < 12 * 60 ? "MORNING" : "AFTERNOON";
}

function slotWindowSortKeyForGrid(startTime, endTime) {
  const sm = timeToMinutesForGrid(startTime);
  const em = timeToMinutesForGrid(endTime);
  if (Number.isFinite(sm) && Number.isFinite(em)) return sm * 1440 + em;
  return `${startTime}\0${endTime}`;
}

const EDIT_MODAL_CAL_GRID_COLS = "168px repeat(7, minmax(72px, 1fr))";

function EditModalWeekSlotGridSkeleton() {
  const skHeader = { bgcolor: "rgba(255,255,255,0.22)", transform: "none" };
  const skStrip = { bgcolor: "rgba(148,163,184,0.32)", transform: "none", borderRadius: 1 };
  const skCell = { bgcolor: "rgba(148,163,184,0.28)", transform: "none", borderRadius: 1 };

  const bodyRow = (stripBg, rowKey) => (
    <Box
      key={rowKey}
      sx={{
        display: "grid",
        gridTemplateColumns: EDIT_MODAL_CAL_GRID_COLS,
        borderBottom: EDIT_MODAL_CAL_GRID_ROW,
        bgcolor: rowKey % 2 === 0 ? "rgba(255, 255, 255, 0.98)" : "rgba(248, 250, 252, 0.94)",
        width: "100%",
        minWidth: 0,
      }}
    >
      <Box
        sx={{
          minHeight: 44,
          bgcolor: stripBg,
          borderRight: EDIT_MODAL_CAL_GRID_COL,
          px: 1,
          py: 0.65,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 0.5,
        }}
      >
        <Skeleton variant="rounded" height={14} width="78%" animation="wave" sx={skStrip} />
        <Skeleton variant="rounded" height={11} width="52%" animation="wave" sx={{ ...skStrip, bgcolor: "rgba(148,163,184,0.22)" }} />
      </Box>
      {Array.from({ length: 7 }).map((_, j) => (
        <Box
          key={j}
          sx={{
            borderLeft: EDIT_MODAL_CAL_GRID_COL,
            minHeight: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            px: 0.35,
          }}
        >
          <Skeleton variant="rounded" width="82%" height={28} animation="wave" sx={skCell} />
        </Box>
      ))}
    </Box>
  );

  return (
    <Box sx={{ width: "100%", minWidth: 0, overflowX: "auto", pb: 0.5 }}>
      <Box
        sx={{
          border: counsellorDetailModalSx.fieldBorder,
          borderRadius: 2,
          overflow: "hidden",
          bgcolor: "#fff",
          minWidth: 720,
          maxHeight: 340,
          overflowY: "auto",
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: EDIT_MODAL_CAL_GRID_COLS,
            bgcolor: EDIT_MODAL_CAL_HEADER,
            color: "#fff",
            width: "100%",
          }}
        >
          <Box sx={{ px: 1, py: 0.65 }}>
            <Skeleton variant="text" width={72} height={20} animation="wave" sx={skHeader} />
          </Box>
          {Array.from({ length: 7 }).map((_, i) => (
            <Box
              key={i}
              sx={{
                px: 0.5,
                py: 0.65,
                borderLeft: EDIT_MODAL_CAL_GRID_HEAD_COL,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Skeleton variant="rounded" width="70%" height={18} animation="wave" sx={skHeader} />
            </Box>
          ))}
        </Box>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: EDIT_MODAL_CAL_GRID_COLS,
            bgcolor: EDIT_MODAL_CAL_HEADER,
            color: "#fff",
            borderTop: "1px solid rgba(255,255,255,0.28)",
            borderBottom: "1px solid rgba(148,163,184,0.35)",
            width: "100%",
          }}
        >
          <Box sx={{ px: 1, py: 0.55 }}>
            <Skeleton variant="text" width={56} height={18} animation="wave" sx={skHeader} />
          </Box>
          {Array.from({ length: 7 }).map((_, i) => (
            <Box
              key={i}
              sx={{
                px: 0.5,
                py: 0.55,
                borderLeft: EDIT_MODAL_CAL_GRID_HEAD_COL,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Skeleton variant="rounded" width="65%" height={16} animation="wave" sx={skHeader} />
            </Box>
          ))}
        </Box>
        {bodyRow("#fef3c7", 0)}
        {bodyRow("#fef3c7", 1)}
        {bodyRow("#dbeafe", 2)}
        {bodyRow("#dbeafe", 3)}
      </Box>
    </Box>
  );
}

function EditModalCounsellorListSkeleton() {
  return (
    <List
      dense
      disablePadding
      sx={{
        border: counsellorDetailModalSx.fieldBorder,
        borderRadius: 2,
        bgcolor: "#fff",
        maxHeight: 220,
        overflow: "hidden",
      }}
    >
      {[0, 1, 2].map((i) => (
        <ListItem
          key={i}
          sx={{
            px: 1.5,
            py: 1.25,
            borderBottom: "1px solid #e2f0fb",
            "&:last-of-type": { borderBottom: "none" },
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Skeleton width="42%" height={22} animation="wave" sx={{ transform: "none", maxWidth: 200 }} />
            <Skeleton width="78%" height={17} animation="wave" sx={{ mt: 0.65, transform: "none" }} />
            <Skeleton width="64%" height={17} animation="wave" sx={{ mt: 0.45, transform: "none" }} />
          </Box>
          <Skeleton
            variant="rounded"
            width={56}
            height={32}
            animation="wave"
            sx={{ flexShrink: 0, transform: "none", borderRadius: 1 }}
          />
        </ListItem>
      ))}
    </List>
  );
}

function EditModalWeekSlotGrid({ weekDays, slots, appointmentDate, appointmentTime, onPickSlot }) {
  const uniqueSlotWindows = useMemo(() => {
    const byKey = new Map();
    (slots || []).forEach((slot) => {
      const st = normalizeSlotTimeForGrid(slot?.startTime);
      const et = normalizeSlotTimeForGrid(slot?.endTime);
      if (!st || !et) return;
      const key = `${st}|${et}`;
      if (!byKey.has(key)) byKey.set(key, { startTime: st, endTime: et, key });
    });
    return Array.from(byKey.values()).sort(
      (a, b) => slotWindowSortKeyForGrid(a.startTime, a.endTime) - slotWindowSortKeyForGrid(b.startTime, b.endTime)
    );
  }, [slots]);

  const slotWindowsBySession = useMemo(() => {
    const morning = [];
    const afternoon = [];
    uniqueSlotWindows.forEach((w) => {
      (detectSessionForGrid(w.startTime) === "MORNING" ? morning : afternoon).push(w);
    });
    return { morning, afternoon };
  }, [uniqueSlotWindows]);

  const slotByDayAndWindow = useMemo(() => {
    const map = new Map();
    (slots || []).forEach((slot) => {
      const date = String(slot?.date || "").slice(0, 10);
      const st = normalizeSlotTimeForGrid(slot?.startTime);
      const et = normalizeSlotTimeForGrid(slot?.endTime);
      if (!date || !st || !et) return;
      map.set(`${date}|${st}|${et}`, slot);
    });
    return map;
  }, [slots]);

  if (!weekDays || weekDays.length !== 7) return null;

  const year = weekDays[0]?.date?.getFullYear?.() ?? "";

  const renderSlotRow = (win, rowIdx) => {
    const session = detectSessionForGrid(win.startTime);
    const stripBg = session === "MORNING" ? "#fef3c7" : "#dbeafe";
    const rowBg = rowIdx % 2 === 0 ? "rgba(255, 255, 255, 0.98)" : "rgba(248, 250, 252, 0.94)";
    return (
      <Box
        key={win.key}
        sx={{
          display: "grid",
          gridTemplateColumns: EDIT_MODAL_CAL_GRID_COLS,
          borderBottom: EDIT_MODAL_CAL_GRID_ROW,
          bgcolor: rowBg,
          width: "100%",
          minWidth: 0,
        }}
      >
        <Box
          sx={{
            minHeight: 44,
            bgcolor: stripBg,
            borderRight: EDIT_MODAL_CAL_GRID_COL,
            px: 1,
            py: 0.65,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 0.15,
          }}
        >
          <Typography sx={{ fontSize: "0.75rem", fontWeight: 800, color: "#1e293b", fontVariantNumeric: "tabular-nums" }}>
            {win.startTime} – {win.endTime}
          </Typography>
          <Typography sx={{ fontSize: "0.65rem", fontWeight: 600, color: "#64748b" }}>
            {session === "MORNING" ? "Ca sáng" : "Ca chiều"}
          </Typography>
        </Box>
        {weekDays.map((day) => {
          const cellKey = `${day.dateYmd}|${win.startTime}|${win.endTime}`;
          const slot = slotByDayAndWindow.get(cellKey);
          const selected = slot && slotMatchesSelection(slot, appointmentDate, appointmentTime);
          return (
            <Box
              key={`${win.key}-${day.dateYmd}`}
              sx={{
                px: 0.5,
                py: 0.45,
                borderLeft: EDIT_MODAL_CAL_GRID_COL,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 44,
              }}
            >
              {slot ? (
                <Chip
                  size="small"
                  label={
                    String(slot.statusLabel || slot.status || "").trim() ||
                    `${win.startTime}–${win.endTime}`
                  }
                  onClick={() => onPickSlot(slot)}
                  variant={selected ? "filled" : "outlined"}
                  sx={{
                    cursor: "pointer",
                    maxWidth: "100%",
                    fontWeight: 700,
                    fontSize: "0.65rem",
                    height: 26,
                    transition: "background-color 120ms ease, border-color 120ms ease, color 120ms ease, box-shadow 120ms ease",
                    "& .MuiChip-label": { px: 0.6, overflow: "hidden", textOverflow: "ellipsis" },
                    ...(selected
                      ? {
                          bgcolor: "#1565c0",
                          color: "#fff",
                          borderColor: "#1565c0",
                          boxShadow: "0 2px 8px rgba(21,101,160,0.35)",
                          "&:hover": {
                            bgcolor: "#125a9e",
                            borderColor: "#125a9e",
                            boxShadow: "0 2px 6px rgba(21,101,160,0.28)",
                          },
                          "&:active": { boxShadow: "0 1px 3px rgba(21,101,160,0.22)" },
                        }
                      : {
                          borderColor: "#cbd5e1",
                          color: "#475569",
                          bgcolor: "#f1f5f9",
                          "&:hover": {
                            bgcolor: "#e2e8f0",
                            borderColor: "#94a3b8",
                            color: "#0f172a",
                            boxShadow: "none",
                          },
                          "&:active": { bgcolor: "#cbd5e1" },
                        }),
                  }}
                />
              ) : (
                <Box sx={{ width: "100%", minHeight: 8 }} aria-hidden />
              )}
            </Box>
          );
        })}
      </Box>
    );
  };

  const renderEmptySessionRow = (sessionKey, rowIdx) => {
    const stripBg = sessionKey === "MORNING" ? "#fef3c7" : "#dbeafe";
    const rowBg = rowIdx % 2 === 0 ? "rgba(255, 255, 255, 0.98)" : "rgba(248, 250, 252, 0.94)";
    const label = sessionKey === "MORNING" ? "Ca sáng" : "Ca chiều";
    return (
      <Box
        key={`empty-${sessionKey}`}
        sx={{
          display: "grid",
          gridTemplateColumns: EDIT_MODAL_CAL_GRID_COLS,
          borderBottom: EDIT_MODAL_CAL_GRID_ROW,
          bgcolor: rowBg,
          width: "100%",
          minWidth: 0,
        }}
      >
        <Box
          sx={{
            minHeight: 44,
            bgcolor: stripBg,
            borderRight: EDIT_MODAL_CAL_GRID_COL,
            px: 1,
            py: 0.65,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <Typography sx={{ fontSize: "0.75rem", fontWeight: 800, color: "#1e293b" }}>{label}</Typography>
          <Typography sx={{ fontSize: "0.65rem", fontWeight: 600, color: "#94a3b8", fontStyle: "italic" }}>
            Chưa có slot
          </Typography>
        </Box>
        {weekDays.map((day) => (
          <Box
            key={`${sessionKey}-e-${day.dateYmd}`}
            sx={{
              borderLeft: EDIT_MODAL_CAL_GRID_COL,
              minHeight: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          />
        ))}
      </Box>
    );
  };

  const { morning, afternoon } = slotWindowsBySession;
  const bodyRows = [];
  let rowIdx = 0;
  morning.forEach((win) => {
    bodyRows.push(renderSlotRow(win, rowIdx));
    rowIdx += 1;
  });
  if (morning.length === 0) {
    bodyRows.push(renderEmptySessionRow("MORNING", rowIdx));
    rowIdx += 1;
  }
  afternoon.forEach((win) => {
    bodyRows.push(renderSlotRow(win, rowIdx));
    rowIdx += 1;
  });
  if (afternoon.length === 0) {
    bodyRows.push(renderEmptySessionRow("AFTERNOON", rowIdx));
    rowIdx += 1;
  }

  return (
    <Box sx={{ width: "100%", minWidth: 0, overflowX: "auto", pb: 0.5 }}>
      <Box
        sx={{
          border: counsellorDetailModalSx.fieldBorder,
          borderRadius: 2,
          overflow: "hidden",
          bgcolor: "#fff",
          minWidth: 720,
          maxHeight: 340,
          overflowY: "auto",
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: EDIT_MODAL_CAL_GRID_COLS,
            bgcolor: EDIT_MODAL_CAL_HEADER,
            color: "#fff",
            width: "100%",
          }}
        >
          <Box sx={{ px: 1, py: 0.65 }}>
            <Typography sx={{ fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.02em" }}>NĂM {year}</Typography>
          </Box>
          {weekDays.map((day) => (
            <Box
              key={`h1-${day.dateYmd}`}
              sx={{
                px: 0.5,
                py: 0.65,
                borderLeft: EDIT_MODAL_CAL_GRID_HEAD_COL,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography sx={{ fontSize: "0.72rem", fontWeight: 600, textAlign: "center", width: "100%" }}>
                {day.dayLabel}
              </Typography>
            </Box>
          ))}
        </Box>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: EDIT_MODAL_CAL_GRID_COLS,
            bgcolor: EDIT_MODAL_CAL_HEADER,
            color: "#fff",
            borderTop: "1px solid rgba(255,255,255,0.28)",
            borderBottom: "1px solid rgba(148,163,184,0.35)",
            width: "100%",
          }}
        >
          <Box sx={{ px: 1, py: 0.55 }}>
            <Typography sx={{ fontSize: "0.7rem", fontWeight: 600 }}>TUẦN</Typography>
          </Box>
          {weekDays.map((day) => (
            <Box
              key={`h2-${day.dateYmd}`}
              sx={{
                px: 0.5,
                py: 0.55,
                borderLeft: EDIT_MODAL_CAL_GRID_HEAD_COL,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography sx={{ fontSize: "0.7rem", fontWeight: 500, textAlign: "center", width: "100%" }}>
                {formatAppointmentDate(day.dateYmd).slice(0, 5)}
              </Typography>
            </Box>
          ))}
        </Box>
        {bodyRows}
      </Box>
    </Box>
  );
}

export default function CounsellorConsultationManagement() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [listTotalItems, setListTotalItems] = useState(0);
  const [activeListStatus, setActiveListStatus] = useState(COUNSELLOR_OFFLINE_CONSULTATION_STATUSES[0]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRow, setDetailRow] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [editForm, setEditForm] = useState({
    appointmentDate: "",
    appointmentTime: "",
  });
  const [editSlots, setEditSlots] = useState([]);
  const [editSlotsLoading, setEditSlotsLoading] = useState(false);
  const [editCounsellors, setEditCounsellors] = useState([]);
  const [editCounsellorsLoading, setEditCounsellorsLoading] = useState(false);
  const [editCalendarAnchorDate, setEditCalendarAnchorDate] = useState(() => new Date());
  const [editCounsellorQueryKey, setEditCounsellorQueryKey] = useState(null);
  const [editUiAssignedCounsellor, setEditUiAssignedCounsellor] = useState(null);
  const [editSlotBaselineKey, setEditSlotBaselineKey] = useState(null);
  const [editSaveLoading, setEditSaveLoading] = useState(false);

  useEffect(() => {
    if (!editOpen || !editRow) return;
    const bounds = weekBoundsFromRow(editRow, String(editRow?.appointmentDate ?? "").trim().slice(0, 10));
    let anchor = new Date();
    if (bounds?.startDate) {
      const d0 = parseYmdToLocalDate(bounds.startDate);
      if (d0) anchor = startMondayDate(d0);
    } else {
      const d1 = parseYmdToLocalDate(String(editRow?.appointmentDate ?? "").slice(0, 10));
      if (d1) anchor = startMondayDate(d1);
    }
    setEditCalendarAnchorDate(anchor);
  }, [editOpen, editRow?.id]);

  const editSlotWeekBounds = useMemo(() => {
    if (!editOpen) return null;
    const mon = startMondayDate(editCalendarAnchorDate);
    const sun = addCalendarDays(mon, 6);
    return { startDate: toYmdLocal(mon), endDate: toYmdLocal(sun) };
  }, [editOpen, editCalendarAnchorDate]);

  const editWeekRangeLabel = useMemo(() => {
    if (!editSlotWeekBounds?.startDate || !editSlotWeekBounds?.endDate) return "";
    const sd = parseYmdToLocalDate(editSlotWeekBounds.startDate);
    const ed = parseYmdToLocalDate(editSlotWeekBounds.endDate);
    if (!sd || !ed) return "";
    return `${formatDateViEditModal(sd)} - ${formatDateViEditModal(ed)}`;
  }, [editSlotWeekBounds]);

  const editWeekDays = useMemo(() => {
    if (!editSlotWeekBounds?.startDate) return [];
    const monYmd = String(editSlotWeekBounds.startDate).slice(0, 10);
    const parts = monYmd.split("-").map(Number);
    if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return [];
    const base = new Date(parts[0], parts[1] - 1, parts[2]);
    if (Number.isNaN(base.getTime())) return [];
    return EDIT_MODAL_WEEK_META.map((d) => {
      const dt = new Date(base);
      dt.setDate(dt.getDate() + d.offset);
      return { dayKey: d.key, dayLabel: d.label, date: dt, dateYmd: toYmdLocal(dt) };
    });
  }, [editSlotWeekBounds]);

  const appointmentTimeApi = useMemo(
    () => timeInputToApi(editForm.appointmentTime),
    [editForm.appointmentTime]
  );

  const editCounsellorDraftKey = useMemo(
    () => buildCounsellorQueryKey(editForm.appointmentDate, editForm.appointmentTime),
    [editForm.appointmentDate, editForm.appointmentTime]
  );
  const canConfirmEditSlot = Boolean(
    editCounsellorDraftKey && editCounsellorDraftKey !== editCounsellorQueryKey
  );

  useEffect(() => {
    if (!editOpen || !editSlotWeekBounds?.startDate || !editSlotWeekBounds?.endDate) {
      setEditSlots([]);
      return;
    }
    let cancelled = false;
    setEditSlotsLoading(true);
    (async () => {
      try {
        const res = await getCounsellorSlots({
          startDate: editSlotWeekBounds.startDate,
          endDate: editSlotWeekBounds.endDate,
        });
        if (!cancelled) setEditSlots(parseCounsellorSlotsBody(res));
      } catch (e) {
        const msg =
          e?.response?.data?.message || e?.message || "Không tải được lịch slot.";
        enqueueSnackbar(msg, { variant: "error" });
        if (!cancelled) setEditSlots([]);
      } finally {
        if (!cancelled) setEditSlotsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editOpen, editSlotWeekBounds?.startDate, editSlotWeekBounds?.endDate]);

  useEffect(() => {
    if (!editOpen) {
      setEditCounsellors([]);
      setEditCounsellorsLoading(false);
      return;
    }
    const parsed = parseCounsellorQueryKey(editCounsellorQueryKey);
    if (!parsed) {
      setEditCounsellors([]);
      setEditCounsellorsLoading(false);
      return;
    }
    const { appointmentDate: dateTrim, appointmentTime: appointmentTimeApi } = parsed;
    let cancelled = false;
    setEditCounsellorsLoading(true);
    (async () => {
      try {
        const res = await getCounsellorsForAppointment({
          appointmentDate: dateTrim,
          appointmentTime: appointmentTimeApi,
        });
        if (!cancelled) setEditCounsellors(parseCounsellorsForAppointmentBody(res));
      } catch (e) {
        const msg =
          e?.response?.data?.message || e?.message || "Không tải được danh sách tư vấn viên trong slot.";
        enqueueSnackbar(msg, { variant: "error" });
        if (!cancelled) setEditCounsellors([]);
      } finally {
        if (!cancelled) setEditCounsellorsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editOpen, editCounsellorQueryKey]);

  const load = useCallback(async (pageOneBased) => {
    setLoading(true);
    try {
      const res = await getCounsellorOfflineConsultations({
        status: activeListStatus,
        page: pageOneBased - 1,
        pageSize: PAGE_SIZE,
      });
      const parsed = parseCounsellorOfflineConsultationsResponse(res);
      setItems(parsed.items);
      setTotalPages(parsed.totalPages);
      setListTotalItems(parsed.totalItems ?? 0);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Không tải được danh sách lịch tư vấn. Vui lòng thử lại.";
      enqueueSnackbar(msg, { variant: "error" });
      setItems([]);
      setTotalPages(0);
      setListTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [activeListStatus]);

  useEffect(() => {
    void load(page);
  }, [load, page]);

  const openDetail = (row) => {
    setDetailRow(row);
    setDetailOpen(true);
  };

  const openEdit = (row) => {
    const id = row?.id;
    if (id == null || id === "") {
      enqueueSnackbar("Không xác định được mã lịch để chỉnh sửa.", { variant: "warning" });
      return;
    }
    setEditRow(row);
    const ad = String(row?.appointmentDate ?? "").trim().slice(0, 10);
    const ti = toTimeInputValue(row?.appointmentTime);
    setEditForm({
      appointmentDate: ad,
      appointmentTime: ti,
    });
    setEditCounsellorQueryKey(null);
    setEditUiAssignedCounsellor(null);
    setEditSlotBaselineKey(buildCounsellorQueryKey(ad, ti));
    setEditOpen(true);
  };

  const openEditFromDetail = () => {
    if (!detailRow) return;
    const row = detailRow;
    const id = row?.id;
    if (id == null || id === "") {
      enqueueSnackbar("Không xác định được mã lịch để chỉnh sửa.", { variant: "warning" });
      return;
    }
    setDetailOpen(false);
    setDetailRow(null);
    openEdit(row);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditRow(null);
    setEditSlots([]);
    setEditCounsellors([]);
    setEditCounsellorQueryKey(null);
    setEditUiAssignedCounsellor(null);
    setEditSlotBaselineKey(null);
    setEditSaveLoading(false);
  };

  const applySlotToEditForm = (slot) => {
    const d = String(slot?.date || "").slice(0, 10);
    if (!d) return;
    const timeIn = toTimeInputValue(slot?.startTime);
    setEditForm((p) => ({
      ...p,
      appointmentDate: d,
      appointmentTime: timeIn,
    }));
    setEditCounsellorQueryKey(null);
    setEditUiAssignedCounsellor(null);
  };

  const handleAssignCounsellor = (c) => {
    if (editUiAssignedCounsellor) return;
    if (!isCounsellorBookingAvailable(c)) return;
    const slotId = c?.counsellorSlotId ?? c?.slotId;
    if (slotId == null || slotId === "") {
      enqueueSnackbar("Thiếu mã slot tư vấn viên để gán.", { variant: "warning" });
      return;
    }
    const rowKey = String(c.counsellorSlotId ?? `${c.counsellorId}-${c.startTime}`);
    setEditUiAssignedCounsellor({
      rowKey,
      counsellorSlotId: slotId,
      counsellorName: String(c.counsellorName ?? "").trim() || "—",
    });
  };

  const handleConfirmEdit = () => {
    const draftKey = buildCounsellorQueryKey(editForm.appointmentDate, editForm.appointmentTime);
    if (!draftKey) {
      enqueueSnackbar("Vui lòng chọn slot trên lịch trước khi xác nhận.", { variant: "warning" });
      return;
    }
    if (draftKey === editCounsellorQueryKey) return;
    setEditUiAssignedCounsellor(null);
    setEditCounsellorQueryKey(draftKey);
  };

  const handleSaveConsultation = async () => {
    const consultationId = Number(editRow?.id);
    if (!Number.isFinite(consultationId) || consultationId < 0) {
      enqueueSnackbar("Không xác định được mã lịch để lưu.", { variant: "warning" });
      return;
    }
    if (!editUiAssignedCounsellor?.counsellorSlotId) {
      enqueueSnackbar("Vui lòng chọn tư vấn viên (Gán) trước khi lưu.", { variant: "warning" });
      return;
    }
    const appointmentDate = String(editForm.appointmentDate || "").trim().slice(0, 10);
    if (!appointmentDate) {
      enqueueSnackbar("Thiếu ngày hẹn (slot trên lịch).", { variant: "warning" });
      return;
    }
    const counsellorSlotId = Number(editUiAssignedCounsellor.counsellorSlotId);
    if (!Number.isFinite(counsellorSlotId) || counsellorSlotId <= 0) {
      enqueueSnackbar("counsellorSlotId không hợp lệ.", { variant: "warning" });
      return;
    }

    const noteRaw = editRow?.note ?? editRow?.consultationNote;
    const cancelRaw = editRow?.cancelReason ?? editRow?.cancel_reason;
    const payload = {
      id: consultationId,
      appointmentDate,
      note: String(noteRaw ?? "").trim(),
      cancelReason: String(cancelRaw ?? "").trim(),
      counsellorSlotId,
      action: "confirm",
    };

    setEditSaveLoading(true);
    try {
      const res = await putCounsellorOfflineConsultation(payload);
      const okMsg = res?.data?.message;
      enqueueSnackbar(
        typeof okMsg === "string" && okMsg.trim() ? okMsg.trim() : "Đã lưu lịch tư vấn.",
        { variant: "success" }
      );
      closeEdit();
      await load(page);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "Lưu không thành công. Vui lòng thử lại.";
      enqueueSnackbar(typeof msg === "string" ? msg : "Lưu không thành công.", { variant: "error" });
    } finally {
      setEditSaveLoading(false);
    }
  };

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
                <EventAvailableOutlinedIcon sx={{ fontSize: 20 }} />
              </Avatar>
              <Box>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 800, lineHeight: 1.2, textShadow: "0 1px 3px rgba(15,23,42,0.12)" }}
                >
                  Quản lý tư vấn
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
                  Lịch tư vấn trực tiếp từ phụ huynh
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Stack spacing={2} sx={{ mt: 2.5, width: "100%", minWidth: 0 }}>
          <Paper sx={{ borderRadius: 3, overflow: "hidden", border: "1px solid #e2e8f0" }}>
            <Tabs
              value={activeListStatus}
              onChange={(_, value) => {
                setActiveListStatus(value);
                setPage(1);
              }}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                px: 1.5,
                borderBottom: "1px solid #e2e8f0",
                bgcolor: "#f8fafc",
                "& .MuiTab-root": {
                  minHeight: 48,
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: 13.5,
                  color: "#475569",
                },
                "& .Mui-selected": {
                  color: "#1565c0 !important",
                },
                "& .MuiTabs-indicator": {
                  backgroundColor: "#1565c0",
                },
              }}
            >
              {COUNSELLOR_OFFLINE_CONSULTATION_STATUSES.map((status) => (
                <Tab key={status} value={status} label={COUNSELLOR_OFFLINE_TAB_LABELS[status] || status} />
              ))}
            </Tabs>

            {loading ? <LinearProgress sx={{ height: 2 }} /> : null}

            <Box sx={{ p: 2, bgcolor: "#f8fafc" }}>
              <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
                <Chip
                  label={`${listTotalItems} lịch hẹn`}
                  size="small"
                  sx={{ bgcolor: "rgba(21,101,160,0.1)", color: "#0d47a1", fontWeight: 700 }}
                />
              </Box>

              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                  <CircularProgress size={32} />
                </Box>
              ) : items.length === 0 ? (
                <Box
                  sx={{
                    py: 5,
                    px: 2,
                    borderRadius: 2,
                    border: "1px dashed rgba(203, 213, 225, 0.5)",
                    bgcolor: "#fafafa",
                    textAlign: "center",
                  }}
                >
                  <Typography variant="body2" sx={{ color: "#64748b" }}>
                    Chưa có lịch tư vấn ở trạng thái{" "}
                    {COUNSELLOR_OFFLINE_TAB_LABELS[activeListStatus] || activeListStatus}.
                  </Typography>
                </Box>
              ) : (
                <TableContainer component={Paper} elevation={0} sx={adminTableContainerSx}>
                  <Table size="small" sx={{ minWidth: 960, ...tableDenseSx }}>
                    <TableHead>
                      <TableRow sx={adminTableHeadRowSx}>
                        <TableCell align="center" sx={{ ...adminTableHeadCellSx, width: 52 }}>
                          STT
                        </TableCell>
                        <TableCell align="center" sx={{ ...adminTableHeadCellSx, minWidth: 120 }}>
                          Tên
                        </TableCell>
                        <TableCell align="center" sx={{ ...adminTableHeadCellSx, minWidth: 100 }}>
                          Số điện thoại
                        </TableCell>
                        <TableCell align="center" sx={{ ...adminTableHeadCellSx, width: 100 }}>Ngày</TableCell>
                        <TableCell align="center" sx={{ ...adminTableHeadCellSx, width: 100 }}>Giờ</TableCell>
                        <TableCell align="center" sx={{ ...adminTableHeadCellSx, minWidth: 220 }}>
                          Câu hỏi
                        </TableCell>
                        <TableCell align="center" sx={{ ...adminTableHeadCellSx, minWidth: 100 }}>Trạng thái</TableCell>
                        <TableCell align="center" sx={{ ...adminTableHeadCellSx, width: 100 }}>Thao tác</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {items.map((row, idx) => (
                        <TableRow
                          key={row.id ?? `${row.parentId}-${row.appointmentDate}-${row.appointmentTime}`}
                          hover
                          sx={adminTableBodyRowSx}
                        >
                          <TableCell align="center" sx={{ verticalAlign: "middle" }}>
                            <Chip
                              label={(page - 1) * PAGE_SIZE + idx + 1}
                              size="small"
                              sx={adminSttChipSx}
                            />
                          </TableCell>
                          <TableCell sx={{ verticalAlign: "middle" }}>
                            <Typography sx={{ fontWeight: 600, fontSize: 14, color: "#1e293b", lineHeight: 1.35 }}>
                              {row.parentName?.trim() || "—"}
                            </Typography>
                          </TableCell>
                          <TableCell align="center" sx={{ verticalAlign: "middle" }}>
                            <Typography sx={{ fontSize: 14, color: "#334155", fontVariantNumeric: "tabular-nums" }}>
                              {row.phone?.trim() || "—"}
                            </Typography>
                          </TableCell>
                          <TableCell align="center" sx={{ verticalAlign: "middle" }}>
                            <Typography sx={{ fontSize: 14, color: "#334155" }}>
                              {formatAppointmentDate(row.appointmentDate) || "—"}
                            </Typography>
                          </TableCell>
                          <TableCell align="center" sx={{ verticalAlign: "middle" }}>
                            <Typography sx={{ fontSize: 14, color: "#334155", fontVariantNumeric: "tabular-nums" }}>
                              {formatAppointmentTime(row.appointmentTime) || "—"}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ verticalAlign: "middle", maxWidth: 280 }}>
                            <Tooltip title={String(row.question || "").trim() || "—"} placement="top-start">
                              <Typography
                                sx={{
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                  wordBreak: "break-word",
                                  lineHeight: 1.45,
                                  fontSize: 14,
                                  color: "#334155",
                                }}
                              >
                                {String(row.question || "").trim() || "—"}
                              </Typography>
                            </Tooltip>
                          </TableCell>
                          <TableCell align="center" sx={{ verticalAlign: "middle" }}>
                            <Box sx={{ display: "flex", justifyContent: "center", width: "100%" }}>{statusTag(row)}</Box>
                          </TableCell>
                          <TableCell align="center" sx={{ verticalAlign: "middle", px: 0.5 }}>
                            <Tooltip title="Xem chi tiết">
                              <IconButton
                                size="small"
                                aria-label="Xem chi tiết"
                                onClick={() => openDetail(row)}
                                sx={viewActionSx}
                              >
                                <VisibilityOutlinedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {!loading && totalPages > 1 ? (
                <Stack direction="row" justifyContent="center" sx={{ pt: 1.5 }}>
                  <Pagination
                    color="primary"
                    count={totalPages}
                    page={page}
                    onChange={(_, value) => setPage(value)}
                    shape="rounded"
                  />
                </Stack>
              ) : null}
            </Box>
          </Paper>
        </Stack>
      </Box>

      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        maxWidth="md"
        fullWidth
        scroll="paper"
        PaperProps={counsellorDialogPaperProps}
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
              background: counsellorDetailModalSx.headerBar,
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
                <EventAvailableOutlinedIcon sx={{ fontSize: 24, color: counsellorDetailModalSx.titleColor }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  component="div"
                  sx={{
                    fontSize: { xs: 18, sm: 20 },
                    fontWeight: 800,
                    lineHeight: 1.25,
                    letterSpacing: "-0.02em",
                    color: counsellorDetailModalSx.titleColor,
                  }}
                >
                  Chi tiết lịch tư vấn
                </Typography>
                <Typography
                  component="div"
                  sx={{ mt: 0.5, fontSize: 13.5, fontWeight: 500, color: "#455a64", lineHeight: 1.45 }}
                >
                  Thông tin phụ huynh, lịch hẹn và nội dung đăng ký
                </Typography>
              </Box>
            </Stack>
            <IconButton
              size="small"
              onClick={() => setDetailOpen(false)}
              aria-label="Đóng"
              sx={{
                color: counsellorDetailModalSx.titleColor,
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
        <DialogContent
          sx={{
            p: 0,
            bgcolor: counsellorDetailModalSx.pageBg,
            maxHeight: { xs: "min(72vh, 560px)", sm: "min(70vh, 520px)" },
            overflow: "auto",
          }}
        >
          {detailRow ? (
            <Box sx={{ px: { xs: 2.25, sm: 2.75 }, pt: { xs: 2, sm: 2.25 }, pb: 2.25 }}>
              <Stack spacing={2}>
                <CounsellorModalSection
                  title="Thông tin phụ huynh"
                  icon={<PersonOutlineOutlinedIcon sx={{ fontSize: 22 }} />}
                >
                  <Grid container spacing={1.5}>
                    <CounsellorDetailField label="Tên phụ huynh" value={detailRow.parentName} grid={6} />
                    <CounsellorDetailField label="Số điện thoại" value={detailRow.phone} grid={6} />
                  </Grid>
                </CounsellorModalSection>
                <CounsellorModalSection
                  title="Lịch hẹn"
                  icon={<EventAvailableOutlinedIcon sx={{ fontSize: 22 }} />}
                >
                  <Grid container spacing={1.5}>
                    <CounsellorDetailField
                      label="Ngày hẹn"
                      value={formatAppointmentDate(detailRow.appointmentDate)}
                      grid={4}
                    />
                    <CounsellorDetailField
                      label="Giờ hẹn"
                      value={formatAppointmentTime(detailRow.appointmentTime)}
                      grid={4}
                    />
                    <CounsellorDetailField label="Tuần" value={weekRangeLabel(detailRow)} grid={4} />
                  </Grid>
                </CounsellorModalSection>
                <CounsellorModalSection
                  title="Nội dung & trạng thái"
                  icon={<StickyNote2OutlinedIcon sx={{ fontSize: 22 }} />}
                >
                  <Grid container spacing={1.5}>
                    <CounsellorDetailField label="Câu hỏi" value={detailRow.question} multiline grid={12} />
                    <CounsellorDetailField label="Trạng thái" grid={6} statusChipFromRow={detailRow} />
                    <CounsellorDetailField label="Ghi chú" value={detailRow.note} grid={6} emptyLabel="Chưa có" />
                    <CounsellorDetailField
                      label="Lý do hủy"
                      value={detailRow.cancelReason}
                      grid={12}
                      emptyLabel="Chưa có"
                    />
                  </Grid>
                </CounsellorModalSection>
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
          <Button
            variant="contained"
            startIcon={<EditOutlinedIcon />}
            onClick={() => void openEditFromDetail()}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              borderRadius: 2,
              px: 3,
              minWidth: 140,
              bgcolor: "#1565c0",
              boxShadow: "0 4px 14px rgba(21, 101, 160, 0.35)",
              "&:hover": { bgcolor: "#0d47a1", boxShadow: "0 6px 18px rgba(13, 71, 161, 0.38)" },
            }}
          >
            Chỉnh sửa
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editOpen}
        onClose={closeEdit}
        maxWidth="md"
        fullWidth
        scroll="paper"
        PaperProps={counsellorDialogPaperProps}
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
              background: counsellorDetailModalSx.headerBar,
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
                <CalendarMonthOutlinedIcon sx={{ fontSize: 24, color: counsellorDetailModalSx.titleColor }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  component="div"
                  sx={{
                    fontSize: { xs: 18, sm: 20 },
                    fontWeight: 800,
                    lineHeight: 1.25,
                    letterSpacing: "-0.02em",
                    color: counsellorDetailModalSx.titleColor,
                  }}
                >
                  Chỉnh sửa lịch hẹn · Gán tư vấn viên
                </Typography>
                <Typography
                  component="div"
                  sx={{ mt: 0.5, fontSize: 13.5, fontWeight: 500, color: "#455a64", lineHeight: 1.45 }}
                >
                  Chọn tuần và slot trên lịch
                </Typography>
              </Box>
            </Stack>
            <IconButton
              size="small"
              onClick={closeEdit}
              aria-label="Đóng"
              sx={{
                color: counsellorDetailModalSx.titleColor,
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
        <DialogContent
          sx={{
            p: 0,
            bgcolor: counsellorDetailModalSx.pageBg,
            maxHeight: { xs: "min(78vh, 640px)", sm: "min(76vh, 600px)" },
            overflow: "auto",
          }}
        >
          {editRow ? (
            <Box sx={{ px: { xs: 2.25, sm: 2.75 }, pt: { xs: 2, sm: 2.25 }, pb: 2.25 }}>
              <Stack spacing={2}>
                <CounsellorModalSection
                  title="Lịch slot trong tuần"
                  icon={<CalendarMonthOutlinedIcon sx={{ fontSize: 22 }} />}
                >
                  <Card elevation={0} sx={{ ...counsellorInnerCardSx, borderRadius: 2 }}>
                    <CardContent sx={{ p: { xs: 1.5, sm: 2 }, "&:last-child": { pb: { xs: 1.5, sm: 2 } } }}>
                      <Stack spacing={2}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5}>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Button
                              variant="outlined"
                              startIcon={<ChevronLeftIcon />}
                              onClick={() => setEditCalendarAnchorDate((prev) => addCalendarDays(prev, -7))}
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
                              onClick={() => setEditCalendarAnchorDate((prev) => addCalendarDays(prev, 7))}
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
                              onClick={() => setEditCalendarAnchorDate(startMondayDate(new Date()))}
                              sx={{
                                textTransform: "none",
                                fontWeight: 700,
                                borderRadius: "12px",
                                px: 2,
                                boxShadow: "0 4px 14px rgba(95,125,185,0.22)",
                                bgcolor: EDIT_MODAL_CAL_BRAND,
                                "&:hover": {
                                  bgcolor: EDIT_MODAL_CAL_BRAND_HOVER,
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
                            <Typography sx={{ fontWeight: 700, color: EDIT_MODAL_CAL_BRAND, fontSize: "0.9rem" }}>
                              {editWeekRangeLabel || "—"}
                            </Typography>
                          </Box>
                        </Stack>

                        {editSlotsLoading ? (
                          <EditModalWeekSlotGridSkeleton />
                        ) : editWeekDays.length !== 7 ? (
                          <Typography variant="body2" sx={{ color: "#64748b" }}>
                            Không xác định được tuần hiển thị.
                          </Typography>
                        ) : (
                          <EditModalWeekSlotGrid
                            weekDays={editWeekDays}
                            slots={editSlots}
                            appointmentDate={editForm.appointmentDate}
                            appointmentTime={editForm.appointmentTime}
                            onPickSlot={applySlotToEditForm}
                          />
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </CounsellorModalSection>

                {editCounsellorQueryKey ? (
                <CounsellorModalSection
                  title="Tư vấn viên trong slot"
                  icon={<GroupsOutlinedIcon sx={{ fontSize: 22 }} />}
                >
                  <Box
                    sx={{
                      mb: 1.25,
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: "#fff",
                      border: counsellorDetailModalSx.fieldBorder,
                    }}
                  >
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: counsellorDetailModalSx.labelColor, mb: 0.6 }}>
                      Slot đang chọn
                    </Typography>
                    {editForm.appointmentDate && appointmentTimeApi ? (
                      <Stack spacing={0.5}>
                        <Typography sx={{ fontSize: 15, fontWeight: 600, color: counsellorDetailModalSx.valueColor, lineHeight: 1.45 }}>
                          {formatAppointmentDateWithWeekday(editForm.appointmentDate)}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: 15,
                            fontWeight: 600,
                            color: counsellorDetailModalSx.valueColor,
                            fontVariantNumeric: "tabular-nums",
                            lineHeight: 1.45,
                          }}
                        >
                          {formatAppointmentTime(appointmentTimeApi)}
                        </Typography>
                      </Stack>
                    ) : (
                      <Typography sx={{ fontSize: 15, fontWeight: 600, color: counsellorDetailModalSx.valueColor }}>
                        —
                      </Typography>
                    )}
                  </Box>
                  {!editForm.appointmentDate || !appointmentTimeApi ? null : editCounsellorsLoading ? (
                    <EditModalCounsellorListSkeleton />
                  ) : editCounsellors.length === 0 ? (
                    <Typography variant="body2" sx={{ color: "#64748b" }}>
                      Không có tư vấn viên nào trong slot này.
                    </Typography>
                  ) : (
                    <List
                      dense
                      disablePadding
                      sx={{
                        border: counsellorDetailModalSx.fieldBorder,
                        borderRadius: 2,
                        bgcolor: "#fff",
                        maxHeight: 220,
                        overflowY: "auto",
                      }}
                    >
                      {editCounsellors.map((c) => {
                        const rowKey = String(c.counsellorSlotId ?? `${c.counsellorId}-${c.startTime}`);
                        const showAssign = isCounsellorBookingAvailable(c);
                        return (
                          <ListItem
                            key={rowKey}
                            sx={{
                              px: 1.5,
                              py: 1.25,
                              borderBottom: "1px solid #e2f0fb",
                              "&:last-of-type": { borderBottom: "none" },
                              alignItems: "flex-start",
                              gap: 1.25,
                              flexWrap: { xs: "wrap", sm: "nowrap" },
                            }}
                          >
                            <ListItemText
                              sx={{ flex: "1 1 auto", minWidth: 0, m: 0 }}
                              primaryTypographyProps={{
                                component: "div",
                                sx: { fontWeight: 700, fontSize: 15, color: counsellorDetailModalSx.valueColor },
                              }}
                              secondaryTypographyProps={{ component: "div" }}
                              primary={c.counsellorName ?? "—"}
                              secondary={
                                <Stack spacing={0.35} sx={{ mt: 0.5 }}>
                                  <Typography
                                    variant="body2"
                                    sx={{ color: "#64748b", lineHeight: 1.45, fontVariantNumeric: "tabular-nums" }}
                                  >
                                    {formatAppointmentTime(c.startTime)} – {formatAppointmentTime(c.endTime)}
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: "#64748b", lineHeight: 1.45 }}>
                                    {c.bookingStatus ?? "—"}
                                  </Typography>
                                </Stack>
                              }
                            />
                            {showAssign ? (
                              editUiAssignedCounsellor?.rowKey === rowKey ? (
                                <Chip
                                  label="Đã chọn"
                                  size="small"
                                  sx={{
                                    flexShrink: 0,
                                    alignSelf: { xs: "flex-start", sm: "center" },
                                    fontWeight: 800,
                                    bgcolor: "rgba(21,101,160,0.12)",
                                    color: "#0d47a1",
                                    border: "1px solid rgba(13,71,161,0.28)",
                                  }}
                                />
                              ) : (
                                <Button
                                  variant="contained"
                                  size="small"
                                  disabled={Boolean(editUiAssignedCounsellor)}
                                  onClick={() => handleAssignCounsellor(c)}
                                  sx={{
                                    flexShrink: 0,
                                    alignSelf: { xs: "stretch", sm: "center" },
                                    textTransform: "none",
                                    fontWeight: 700,
                                    borderRadius: 1.5,
                                    px: 1.5,
                                    minWidth: 72,
                                    bgcolor: "#1565c0",
                                    boxShadow: "none",
                                    "&:hover": { bgcolor: "#0d47a1", boxShadow: "none" },
                                    "&.Mui-disabled": { bgcolor: "rgba(148,163,184,0.35)", color: "rgba(255,255,255,0.92)" },
                                  }}
                                >
                                  Gán
                                </Button>
                              )
                            ) : null}
                          </ListItem>
                        );
                      })}
                    </List>
                  )}
                </CounsellorModalSection>
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
          {editUiAssignedCounsellor ? (
            <Button
              onClick={() => void handleSaveConsultation()}
              variant="contained"
              disabled={editSaveLoading || !Number.isFinite(Number(editRow?.id))}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                borderRadius: 2,
                px: 3,
                minWidth: 132,
                bgcolor: "#1565c0",
                boxShadow: "0 4px 14px rgba(21, 101, 160, 0.35)",
                "&:hover": { bgcolor: "#0d47a1", boxShadow: "0 6px 18px rgba(13, 71, 161, 0.38)" },
              }}
            >
              {editSaveLoading ? (
                <CircularProgress size={22} thickness={5} sx={{ color: "inherit" }} />
              ) : (
                "Lưu"
              )}
            </Button>
          ) : (
            <Button
              onClick={handleConfirmEdit}
              variant="contained"
              disabled={editSaveLoading || !canConfirmEditSlot}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                borderRadius: 2,
                px: 3,
                minWidth: 132,
                bgcolor: "#1565c0",
                boxShadow: "0 4px 14px rgba(21, 101, 160, 0.35)",
                "&:hover": { bgcolor: "#0d47a1", boxShadow: "0 6px 18px rgba(13, 71, 161, 0.38)" },
              }}
            >
              Xác nhận
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function weekRangeLabel(row) {
  const a = String(row?.startDateOfWeek || "").trim();
  const b = String(row?.endDateOfWeek || "").trim();
  if (!a && !b) return "—";
  const fa = a ? formatAppointmentDate(a) : "";
  const fb = b ? formatAppointmentDate(b) : "";
  if (fa && fb) return `${fa} – ${fb}`;
  return fa || fb || "—";
}

