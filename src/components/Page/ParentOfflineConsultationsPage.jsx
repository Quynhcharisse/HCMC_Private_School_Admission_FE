import React, { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Container,
  Grid,
  LinearProgress,
  Pagination,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import StickyNote2OutlinedIcon from "@mui/icons-material/StickyNote2Outlined";
import { enqueueSnackbar } from "notistack";
import {
  getParentOfflineConsultations,
  OFFLINE_CONSULTATION_STATUSES,
  parseOfflineConsultationsResponse,
} from "../../services/ParentOfflineConsultationService.jsx";

const STATUS_LABELS = {
  pending: "Đang chờ",
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

export default function ParentOfflineConsultationsPage() {
  const [activeStatus, setActiveStatus] = useState(OFFLINE_CONSULTATION_STATUSES[0]);
  const [page, setPage] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

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
                  const parentName = hasText(row?.parentName) ? String(row.parentName).trim() : "";
                  const studentName = pickStudentName(row);
                  const slotParts = formatSlotDisplayParts(row);
                  const showStudent = hasText(studentName);
                  const showPhone = hasText(row?.phone);
                  const showQuestion = hasText(row?.question);
                  const showNote = hasText(row?.note);
                  const showSlot = slotParts != null;
                  const showContact = hasText(parentName) || showPhone;
                  const rowNumericId = row?.id ?? row?.consultationId;
                  const showIdBadge = rowNumericId != null && rowNumericId !== "";

                  return (
                    <Grid key={id} item xs={12} sm={6} sx={{ display: "flex", minWidth: 0 }}>
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
                          {showContact || showStudent ? (
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
                                {showContact ? (
                                  <Box sx={{ mb: showStudent ? 1.5 : 0 }}>
                                    <Typography component="span" sx={softLabelSx}>
                                      Thông tin liên hệ
                                    </Typography>
                                    {hasText(parentName) ? (
                                      <Typography
                                        sx={{
                                          fontSize: 16,
                                          fontWeight: 700,
                                          color: "#0f172a",
                                          wordBreak: "break-word",
                                          lineHeight: 1.35,
                                        }}
                                      >
                                        {parentName}
                                      </Typography>
                                    ) : null}
                                    {showPhone ? (
                                      <Typography
                                        sx={{
                                          fontSize: 14,
                                          color: "#475569",
                                          mt: hasText(parentName) ? 0.35 : 0,
                                          fontWeight: 500,
                                        }}
                                      >
                                        {row.phone}
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
                              {showIdBadge ? (
                                <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                                  <Typography sx={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>
                                    Mã lịch
                                  </Typography>
                                  <Typography
                                    sx={{
                                      fontSize: 22,
                                      fontWeight: 800,
                                      background: "linear-gradient(90deg, #7c3aed, #4f46e5)",
                                      backgroundClip: "text",
                                      WebkitBackgroundClip: "text",
                                      WebkitTextFillColor: "transparent",
                                      color: "#7c3aed",
                                      lineHeight: 1.2,
                                      mt: 0.25,
                                    }}
                                  >
                                    #{rowNumericId}
                                  </Typography>
                                </Box>
                              ) : null}
                            </Box>
                          ) : null}

                          {showQuestion ? (
                            <Box
                              sx={{
                                px: 2.25,
                                py: 2,
                                borderTop: "1px solid #ede9fe",
                                background:
                                  "linear-gradient(180deg, rgba(124, 58, 237, 0.06) 0%, rgba(99, 102, 241, 0.03) 100%)",
                              }}
                            >
                              <Typography component="span" sx={{ ...softLabelSx, color: "#5b21b6", mb: 1 }}>
                                Nội dung đăng ký
                              </Typography>
                              <Typography
                                sx={{
                                  fontSize: 14,
                                  color: "#4338ca",
                                  lineHeight: 1.65,
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-word",
                                  fontWeight: 500,
                                }}
                              >
                                {row.question}
                              </Typography>
                            </Box>
                          ) : null}

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
    </Container>
  );
}
