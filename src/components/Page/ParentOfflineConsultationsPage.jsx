import React, { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  LinearProgress,
  Pagination,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import StickyNote2OutlinedIcon from "@mui/icons-material/StickyNote2Outlined";
import { enqueueSnackbar } from "notistack";
import {
  getParentOfflineConsultations,
  OFFLINE_CONSULTATION_STATUSES,
  parseOfflineConsultationsResponse,
} from "../../services/ParentOfflineConsultationService.jsx";

const STATUS_LABELS = {
  pending: "Chờ tư vấn",
  confirmed: "Đã xác nhận",
  "in-progress": "Đang diễn ra",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
  "no-show": "Vắng mặt",
};

const PAGE_SIZE = 10;

const hasText = (v) => v != null && String(v).trim() !== "";

const softLabelSx = {
  fontSize: 13,
  fontWeight: 600,
  color: "#64748b",
  mb: 0.75,
  display: "block",
};

const pickStudentName = (row) =>
  row?.studentName || row?.childName || row?.student?.name || row?.student?.fullName || "";

const pickTrim = (v) => (hasText(v) ? String(v).trim() : "");

const formatOfflineAppointment = (row) => {
  const dateStr = row?.appointmentDate;
  const timeStr = row?.appointmentTime;

  if (hasText(dateStr) && hasText(timeStr)) {
    const dp = String(dateStr).trim().split("-").map((x) => Number(x));
    const tp = String(timeStr).trim().split(":").map((x) => Number(x));
    if (dp.length >= 3 && tp.length >= 2 && dp.every((n) => Number.isFinite(n))) {
      const [y, mo, d] = dp;
      const hh = Number.isFinite(tp[0]) ? tp[0] : 0;
      const mm = Number.isFinite(tp[1]) ? tp[1] : 0;
      const ss = Number.isFinite(tp[2]) ? tp[2] : 0;
      const combined = new Date(y, mo - 1, d, hh, mm, ss);
      if (!Number.isNaN(combined.getTime())) {
        return combined.toLocaleString("vi-VN", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      }
    }
  }

  if (hasText(dateStr) && !hasText(timeStr)) {
    const dp = String(dateStr).trim().split("-").map((x) => Number(x));
    if (dp.length >= 3 && dp.every((n) => Number.isFinite(n))) {
      const [y, mo, d] = dp;
      const onlyDate = new Date(y, mo - 1, d);
      if (!Number.isNaN(onlyDate.getTime())) {
        return onlyDate.toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      }
    }
  }

  if (!hasText(dateStr) && hasText(timeStr)) {
    return String(timeStr).trim();
  }

  const raw =
    row?.consultationDateTime ||
    row?.consultationTime ||
    row?.scheduledAt ||
    row?.startTime ||
    "";
  if (!hasText(raw)) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw).trim() || null;
  return d.toLocaleString("vi-VN", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatSlotDisplayParts = (row) => {
  const dateStr = row?.appointmentDate;
  const timeStr = row?.appointmentTime;

  if (hasText(dateStr) && hasText(timeStr)) {
    const dp = String(dateStr).trim().split("-").map((x) => Number(x));
    const tp = String(timeStr).trim().split(":").map((x) => Number(x));
    if (dp.length >= 3 && tp.length >= 2 && dp.every((n) => Number.isFinite(n))) {
      const [y, mo, d] = dp;
      const hh = Number.isFinite(tp[0]) ? tp[0] : 0;
      const mm = Number.isFinite(tp[1]) ? tp[1] : 0;
      const ss = Number.isFinite(tp[2]) ? tp[2] : 0;
      const combined = new Date(y, mo - 1, d, hh, mm, ss);
      if (!Number.isNaN(combined.getTime())) {
        const primary = combined.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
        const secondary = combined.toLocaleDateString("vi-VN", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        return { primary, secondary };
      }
    }
  }

  if (hasText(dateStr) && !hasText(timeStr)) {
    const dp = String(dateStr).trim().split("-").map((x) => Number(x));
    if (dp.length >= 3 && dp.every((n) => Number.isFinite(n))) {
      const [y, mo, d] = dp;
      const onlyDate = new Date(y, mo - 1, d);
      if (!Number.isNaN(onlyDate.getTime())) {
        const primary = onlyDate.toLocaleDateString("vi-VN", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        return { primary, secondary: null };
      }
    }
  }

  if (!hasText(dateStr) && hasText(timeStr)) {
    return { primary: String(timeStr).trim(), secondary: null };
  }

  const fallback = formatOfflineAppointment(row);
  if (!fallback) return null;
  return { primary: fallback, secondary: null };
};

const getOfflineScheduleDisplay = (row) => {
  const combined = formatOfflineAppointment(row);
  const dateRaw = pickTrim(row?.appointmentDate);
  const timeRaw = pickTrim(row?.appointmentTime);
  if (hasText(combined)) return pickTrim(combined);
  if (dateRaw && timeRaw) return `${dateRaw} · ${timeRaw}`;
  if (dateRaw) return dateRaw;
  if (timeRaw) return timeRaw;
  return "";
};

const offlineDetailModalSx = {
  pageBg: "#e8f4fc",
  sectionBorder: "1px solid #b0cfe8",
  sectionInnerBg: "rgba(255,255,255,0.72)",
  labelColor: "#1565c0",
  titleColor: "#0d47a1",
  valueColor: "#1e293b",
  fieldBorder: "1px solid #cfe8f8",
  headerBar: "linear-gradient(180deg, #dceef9 0%, #c9e3f5 100%)",
};

function OfflineConsultDetailField({ label, value, grid = 12 }) {
  if (!hasText(value)) return null;
  return (
    <Grid size={{ xs: 12, sm: grid }}>
      <Box
        sx={{
          bgcolor: "#fff",
          border: offlineDetailModalSx.fieldBorder,
          borderRadius: 2,
          p: 1.75,
          height: "100%",
        }}
      >
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: offlineDetailModalSx.labelColor, mb: 0.5 }}>
          {label}
        </Typography>
        <Typography
          sx={{
            fontSize: 15,
            fontWeight: 500,
            color: offlineDetailModalSx.valueColor,
            lineHeight: 1.55,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {value}
        </Typography>
      </Box>
    </Grid>
  );
}

function OfflineConsultDetailSection({ title, icon, children }) {
  return (
    <Box
      sx={{
        border: offlineDetailModalSx.sectionBorder,
        borderRadius: 2.5,
        p: 2,
        bgcolor: offlineDetailModalSx.sectionInnerBg,
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
            color: offlineDetailModalSx.titleColor,
          }}
        >
          {icon}
        </Box>
        <Typography
          sx={{
            fontSize: 17,
            fontWeight: 800,
            color: offlineDetailModalSx.titleColor,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </Typography>
      </Stack>
      <Grid container spacing={1.5}>
        {children}
      </Grid>
    </Box>
  );
}

function OfflineConsultDetailContent({ row }) {
  if (!row) return null;

  const statusKey = String(row?.status || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
  const statusLabel = pickTrim(STATUS_LABELS[statusKey] || row?.status);

  const schoolName = pickTrim(row?.schoolName);
  const campusName = pickTrim(row?.campusName);
  const address = pickTrim(row?.address);
  const phone = pickTrim(row?.phone);
  const parentName = pickTrim(row?.parentName);
  const studentName = pickTrim(pickStudentName(row));
  const question = pickTrim(row?.question);
  const note = pickTrim(row?.note);
  const cancelReason = pickTrim(row?.cancelReason);
  const idStr = row?.id != null && row?.id !== "" ? String(row.id) : "";
  const scheduleText = getOfflineScheduleDisplay(row);

  const hasSchool = hasText(schoolName) || hasText(campusName) || hasText(address) || hasText(phone);
  const hasAppt = hasText(idStr) || hasText(statusLabel) || hasText(scheduleText);
  const hasPeople = hasText(parentName) || hasText(studentName);
  const hasContent = hasText(question) || hasText(note) || hasText(cancelReason);

  return (
    <Stack spacing={2}>
      {hasSchool ? (
        <OfflineConsultDetailSection
          title="Thông tin trường & cơ sở"
          icon={<SchoolOutlinedIcon sx={{ fontSize: 22 }} />}
        >
          {hasText(schoolName) ? (
            <OfflineConsultDetailField label="Tên trường" value={schoolName} grid={12} />
          ) : null}
          {hasText(campusName) ? (
            <OfflineConsultDetailField
              label="Tên cơ sở"
              value={campusName}
              grid={hasText(phone) ? 6 : 12}
            />
          ) : null}
          {hasText(phone) ? (
            <OfflineConsultDetailField
              label="Số điện thoại"
              value={phone}
              grid={hasText(campusName) ? 6 : 12}
            />
          ) : null}
          {hasText(address) ? <OfflineConsultDetailField label="Địa chỉ" value={address} grid={12} /> : null}
        </OfflineConsultDetailSection>
      ) : null}

      {hasAppt ? (
        <OfflineConsultDetailSection title="Lịch hẹn" icon={<EventAvailableIcon sx={{ fontSize: 22 }} />}>
          {hasText(idStr) ? (
            <OfflineConsultDetailField label="Mã lịch" value={idStr} grid={hasText(statusLabel) ? 6 : 12} />
          ) : null}
          {hasText(statusLabel) ? (
            <OfflineConsultDetailField
              label="Trạng thái"
              value={statusLabel}
              grid={hasText(idStr) ? 6 : 12}
            />
          ) : null}
          {hasText(scheduleText) ? (
            <OfflineConsultDetailField label="Thời gian" value={scheduleText} grid={12} />
          ) : null}
        </OfflineConsultDetailSection>
      ) : null}

      {hasPeople ? (
        <OfflineConsultDetailSection
          title="Phụ huynh & học sinh"
          icon={<PersonOutlineOutlinedIcon sx={{ fontSize: 22 }} />}
        >
          {hasText(parentName) ? (
            <OfflineConsultDetailField
              label="Phụ huynh"
              value={parentName}
              grid={hasText(studentName) ? 6 : 12}
            />
          ) : null}
          {hasText(studentName) ? (
            <OfflineConsultDetailField
              label="Học sinh"
              value={studentName}
              grid={hasText(parentName) ? 6 : 12}
            />
          ) : null}
        </OfflineConsultDetailSection>
      ) : null}

      {hasContent ? (
        <OfflineConsultDetailSection
          title="Nội dung & ghi chú"
          icon={<StickyNote2OutlinedIcon sx={{ fontSize: 22 }} />}
        >
          {hasText(question) ? (
            <OfflineConsultDetailField label="Nội dung đăng ký" value={question} grid={12} />
          ) : null}
          {hasText(note) ? <OfflineConsultDetailField label="Ghi chú" value={note} grid={12} /> : null}
          {hasText(cancelReason) ? (
            <OfflineConsultDetailField label="Lý do hủy" value={cancelReason} grid={12} />
          ) : null}
        </OfflineConsultDetailSection>
      ) : null}
    </Stack>
  );
}

export default function ParentOfflineConsultationsPage() {
  const [activeStatus, setActiveStatus] = useState(OFFLINE_CONSULTATION_STATUSES[0]);
  const [page, setPage] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [detailRow, setDetailRow] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const response = await getParentOfflineConsultations({
          status: activeStatus,
          page,
          pageSize: PAGE_SIZE,
        });
        if (response?.status !== 200) {
          setItems([]);
          return;
        }
        const parsed = parseOfflineConsultationsResponse(response);
        setItems(parsed.items);
        setTotalPages(Math.max(1, parsed.totalPages || 1));
        setTotalItems(parsed.totalItems);
      } catch (error) {
        console.error("Load parent offline consultations failed:", error);
        setItems([]);
        enqueueSnackbar("Không thể tải lịch tư vấn trực tiếp.", { variant: "error" });
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, [activeStatus, page]);

  const emptyText = useMemo(
    () => `Không có lịch tư vấn ở trạng thái "${STATUS_LABELS[activeStatus] || activeStatus}".`,
    [activeStatus]
  );

  return (
    <Container
      maxWidth="lg"
      sx={{
        pt: "90px",
        pb: { xs: 2, sm: 3 },
        px: { xs: 2, sm: 3 },
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.25 }}>
        <Paper
          sx={{
            p: 2.5,
            borderRadius: 3,
            background: "linear-gradient(120deg, #1d4ed8 0%, #2563eb 45%, #0ea5e9 100%)",
            color: "#fff",
            boxShadow: "0 14px 35px rgba(37,99,235,0.25)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
            <Box>
              <Typography sx={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>
                Lịch tư vấn trực tiếp đã đặt
              </Typography>
              <Typography sx={{ mt: 0.65, color: "rgba(255,255,255,0.9)", fontSize: 14 }}>
                Xem lại các lịch hẹn tại trường theo từng trạng thái.
              </Typography>
            </Box>
            <Avatar
              sx={{
                bgcolor: "rgba(255,255,255,0.2)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.4)",
              }}
            >
              <EventAvailableIcon />
            </Avatar>
          </Box>
        </Paper>

        <Paper sx={{ borderRadius: 3, overflow: "hidden", border: "1px solid #e2e8f0" }}>
          <Tabs
            value={activeStatus}
            onChange={(_, value) => {
              setActiveStatus(value);
              setPage(0);
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
                color: "#2563eb !important",
              },
            }}
          >
            {OFFLINE_CONSULTATION_STATUSES.map((status) => (
              <Tab key={status} value={status} label={STATUS_LABELS[status] || status} />
            ))}
          </Tabs>

          {loading ? <LinearProgress sx={{ height: 2 }} /> : null}

          <Box sx={{ p: 2, bgcolor: "#f8fafc" }}>
            <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
              <Chip
                label={`${totalItems} lịch hẹn`}
                size="small"
                sx={{ bgcolor: "rgba(37,99,235,0.1)", color: "#1d4ed8", fontWeight: 700 }}
              />
            </Box>

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                <CircularProgress size={28} />
              </Box>
            ) : items.length === 0 ? (
              <Paper
                variant="outlined"
                sx={{
                  py: 4.5,
                  px: 2,
                  textAlign: "center",
                  borderStyle: "dashed",
                  borderColor: "rgba(148,163,184,0.5)",
                  bgcolor: "#fff",
                  borderRadius: 2,
                }}
              >
                <EventAvailableIcon sx={{ color: "#94a3b8", fontSize: 28 }} />
                <Typography sx={{ color: "#64748b", pt: 1.25 }}>{emptyText}</Typography>
              </Paper>
            ) : (
              <Grid container spacing={2.5}>
                {items.map((row, index) => {
                  const id = row?.id ?? row?.consultationId ?? `${activeStatus}-${index}`;
                  const studentName = pickStudentName(row);
                  const slotParts = formatSlotDisplayParts(row);
                  const showStudent = hasText(studentName);
                  const showNote = hasText(row?.note);
                  const showSlot = slotParts != null;
                  const schoolName = pickTrim(row?.schoolName);
                  const campusName = pickTrim(row?.campusName);
                  const address = pickTrim(row?.address);
                  const showSchoolInfo = hasText(schoolName) || hasText(campusName) || hasText(address);

                  return (
                    <Grid key={id} size={{ xs: 12, sm: 6 }} sx={{ display: "flex", minWidth: 0 }}>
                      <Paper
                        elevation={0}
                        sx={{
                          width: "100%",
                          display: "flex",
                          flexDirection: "column",
                          minHeight: "100%",
                          position: "relative",
                          borderRadius: 3,
                          border: "1px solid #e8e4f0",
                          bgcolor: "#fff",
                          overflow: "hidden",
                          boxShadow: "0 4px 18px rgba(91, 33, 182, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04)",
                          transition:
                            "box-shadow 0.28s cubic-bezier(0.4, 0, 0.2, 1), transform 0.28s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.28s ease",
                          "&::before": {
                            content: '""',
                            position: "absolute",
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: 4,
                            borderRadius: "12px 0 0 12px",
                            background: "linear-gradient(180deg, #7c3aed 0%, #6366f1 45%, #3b82f6 100%)",
                            opacity: 0.85,
                          },
                          "&:hover": {
                            borderColor: "rgba(124, 58, 237, 0.45)",
                            boxShadow:
                              "0 16px 40px rgba(124, 58, 237, 0.14), 0 8px 24px rgba(59, 130, 246, 0.1)",
                            transform: "translateY(-4px)",
                          },
                        }}
                      >
                        {showSlot ? (
                          <Box
                            sx={{
                              pl: 2.25,
                              pr: 2.25,
                              pt: 2.25,
                              pb: 2,
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              gap: 2,
                              background:
                                "linear-gradient(165deg, #faf5ff 0%, #ffffff 38%, #f0f9ff 100%)",
                              borderBottom: "1px solid rgba(226, 232, 240, 0.9)",
                            }}
                          >
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#64748b", mb: 0.35 }}>
                                Thời gian
                              </Typography>
                              <Typography
                                sx={{
                                  fontSize: { xs: 20, sm: 22 },
                                  fontWeight: 800,
                                  color: "#0f172a",
                                  letterSpacing: "-0.02em",
                                  lineHeight: 1.2,
                                }}
                              >
                                {slotParts.primary}
                              </Typography>
                              {slotParts.secondary ? (
                                <Typography sx={{ fontSize: 13.5, color: "#64748b", mt: 0.65, fontWeight: 500 }}>
                                  {slotParts.secondary}
                                </Typography>
                              ) : null}
                            </Box>
                            <Box
                              sx={{
                                width: 48,
                                height: 48,
                                borderRadius: 2.25,
                                flexShrink: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 55%, #2563eb 100%)",
                                boxShadow: "0 10px 24px rgba(124, 58, 237, 0.35)",
                              }}
                            >
                              <EventAvailableIcon sx={{ color: "#fff", fontSize: 26 }} />
                            </Box>
                          </Box>
                        ) : null}

                        <Stack spacing={0} sx={{ flex: 1, minWidth: 0 }}>
                          {showSchoolInfo || showStudent ? (
                            <Box
                              sx={{
                                px: 2.25,
                                py: 2,
                                borderTop: showSlot ? "none" : undefined,
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                gap: 2,
                                background: showSlot ? "transparent" : "linear-gradient(165deg, #faf5ff 0%, #fff 55%)",
                              }}
                            >
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                {showSchoolInfo ? (
                                  <Box sx={{ mb: showStudent ? 1.5 : 0 }}>
                                    <Typography component="span" sx={{ ...softLabelSx, fontWeight: 800 }}>
                                      Thông tin trường
                                    </Typography>
                                    {hasText(schoolName) ? (
                                      <Typography
                                        sx={{
                                          fontSize: 16,
                                          fontWeight: 700,
                                          color: "#0f172a",
                                          wordBreak: "break-word",
                                          lineHeight: 1.35,
                                        }}
                                      >
                                        {schoolName}
                                      </Typography>
                                    ) : null}
                                    {hasText(campusName) ? (
                                      <Typography
                                        sx={{
                                          fontSize: 14,
                                          color: "#475569",
                                          mt: hasText(schoolName) ? 0.35 : 0,
                                          fontWeight: 600,
                                        }}
                                      >
                                        {campusName}
                                      </Typography>
                                    ) : null}
                                    {hasText(address) ? (
                                      <Typography
                                        sx={{
                                          fontSize: 14,
                                          color: "#64748b",
                                          mt: hasText(schoolName) || hasText(campusName) ? 0.35 : 0,
                                          fontWeight: 500,
                                          lineHeight: 1.45,
                                        }}
                                      >
                                        {address}
                                      </Typography>
                                    ) : null}
                                  </Box>
                                ) : null}
                                {showStudent ? (
                                  <Box>
                                    <Typography component="span" sx={softLabelSx}>
                                      Học sinh
                                    </Typography>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                                      <SchoolOutlinedIcon sx={{ fontSize: 18, color: "#7c3aed" }} />
                                      <Typography sx={{ fontSize: 14, color: "#334155", fontWeight: 500 }}>
                                        {studentName}
                                      </Typography>
                                    </Box>
                                  </Box>
                                ) : null}
                              </Box>
                            </Box>
                          ) : null}

                          <Box
                            sx={{
                              px: 2.25,
                              py: 2,
                              borderTop: "1px solid #ede9fe",
                              mt: "auto",
                            }}
                          >
                            <Button
                              variant="outlined"
                              size="medium"
                              onClick={() => setDetailRow(row)}
                              sx={{
                                textTransform: "none",
                                fontWeight: 700,
                                borderRadius: 2,
                                borderColor: "rgba(124, 58, 237, 0.45)",
                                color: "#5b21b6",
                                "&:hover": {
                                  borderColor: "#7c3aed",
                                  bgcolor: "rgba(124, 58, 237, 0.06)",
                                },
                              }}
                            >
                              Xem chi tiết
                            </Button>
                          </Box>

                          {showNote ? (
                            <Box
                              sx={{
                                px: 2.25,
                                py: 2,
                                mt: "auto",
                                borderTop: "1px solid #f1f5f9",
                                bgcolor: "rgba(248, 250, 252, 0.85)",
                              }}
                            >
                              <Typography component="span" sx={softLabelSx}>
                                Ghi chú
                              </Typography>
                              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.75 }}>
                                <StickyNote2OutlinedIcon
                                  sx={{ fontSize: 18, color: "#a78bfa", mt: 0.15, flexShrink: 0 }}
                                />
                                <Typography
                                  sx={{
                                    fontSize: 14,
                                    color: "#475569",
                                    lineHeight: 1.65,
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-word",
                                  }}
                                >
                                  {row.note}
                                </Typography>
                              </Box>
                            </Box>
                          ) : null}
                        </Stack>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            )}

            {items.length > 0 && totalPages > 1 ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mt: 2,
                  alignItems: "center",
                }}
              >
                <Typography variant="body2" sx={{ color: "#64748b" }}>
                  Trang {page + 1} / {Math.max(totalPages, 1)} – {totalItems} lịch hẹn
                </Typography>
                <Stack spacing={1} direction="row" justifyContent="flex-end">
                  <Pagination
                    count={totalPages || 1}
                    page={page + 1}
                    size="small"
                    color="primary"
                    disabled={loading}
                    onChange={(_, value) => {
                      setPage(Math.max(0, value - 1));
                    }}
                  />
                </Stack>
              </Box>
            ) : null}
          </Box>
        </Paper>
      </Box>

      <Dialog
        open={Boolean(detailRow)}
        onClose={() => setDetailRow(null)}
        maxWidth="md"
        fullWidth
        scroll="paper"
        PaperProps={{
          elevation: 0,
          sx: {
            borderRadius: 2.5,
            overflow: "hidden",
            border: "1px solid #9ec9e8",
            boxShadow: "0 20px 45px -12px rgba(13, 71, 161, 0.18)",
          },
        }}
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
              background: offlineDetailModalSx.headerBar,
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
                <EventAvailableIcon sx={{ fontSize: 24, color: offlineDetailModalSx.titleColor }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  component="div"
                  sx={{
                    fontSize: { xs: 18, sm: 20 },
                    fontWeight: 800,
                    lineHeight: 1.25,
                    letterSpacing: "-0.02em",
                    color: offlineDetailModalSx.titleColor,
                  }}
                >
                  Chi tiết lịch tư vấn
                </Typography>
                <Typography
                  component="div"
                  sx={{
                    mt: 0.5,
                    fontSize: 13.5,
                    fontWeight: 500,
                    color: "#455a64",
                    lineHeight: 1.45,
                  }}
                >
                  Thông tin trường, lịch hẹn và nội dung đăng ký
                </Typography>
              </Box>
            </Stack>
            <IconButton
              size="small"
              onClick={() => setDetailRow(null)}
              aria-label="Đóng"
              sx={{
                color: offlineDetailModalSx.titleColor,
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
            bgcolor: offlineDetailModalSx.pageBg,
            maxHeight: { xs: "min(72vh, 560px)", sm: "min(70vh, 520px)" },
            overflow: "auto",
          }}
        >
          <Box
            sx={{
              px: { xs: 2.25, sm: 2.75 },
              pt: { xs: 2, sm: 2.25 },
              pb: 2.25,
            }}
          >
            {detailRow ? <OfflineConsultDetailContent row={detailRow} /> : null}
          </Box>
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
            onClick={() => setDetailRow(null)}
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
            Đóng
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
