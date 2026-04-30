import React, { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Divider,
  LinearProgress,
  Pagination,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { enqueueSnackbar } from "notistack";
import {
  getCounsellorOfflineConsultations,
  OFFLINE_CONSULTATION_STATUSES,
  parseOfflineConsultationsResponse,
} from "../../../services/CounsellorOfflineConsultationService.jsx";

const STATUS_LABELS = {
  pending: "Đang chờ",
  confirmed: "Đã xác nhận",
  "in-progress": "Đang diễn ra",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
  "no-show": "Vắng mặt",
};

const STATUS_CHIP_COLORS = {
  pending: "warning",
  confirmed: "info",
  "in-progress": "primary",
  completed: "success",
  cancelled: "default",
  "no-show": "error",
};

const PAGE_SIZE = 10;

const pickDisplayName = (row) =>
  row?.parentName ||
  row?.parentFullName ||
  row?.fullName ||
  row?.customerName ||
  row?.name ||
  "Phụ huynh";

const pickStudentName = (row) =>
  row?.studentName || row?.childName || row?.student?.name || row?.student?.fullName || "";

const pickScheduleTime = (row) => {
  const raw =
    row?.consultationDateTime ||
    row?.consultationTime ||
    row?.scheduledAt ||
    row?.appointmentTime ||
    row?.startTime ||
    "";
  if (!raw) return "Chưa có lịch cụ thể";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw);
  return d.toLocaleString("vi-VN", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export default function CounsellorOfflineConsultationPage() {
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
        const response = await getCounsellorOfflineConsultations({
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
        setTotalPages(parsed.totalPages);
        setTotalItems(parsed.totalItems);
      } catch (error) {
        console.error("Load offline consultations failed:", error);
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

  const statusTitle = STATUS_LABELS[activeStatus] || activeStatus;

  return (
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
              Lịch tư vấn trực tiếp
            </Typography>
            <Typography sx={{ mt: 0.65, color: "rgba(255,255,255,0.9)", fontSize: 14 }}>
              Theo dõi lịch hẹn trực tiếp của phụ huynh theo từng trạng thái.
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

        <Box sx={{ p: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.75 }}>
            <Typography sx={{ fontSize: 13.5, color: "#334155", fontWeight: 600 }}>
              Trạng thái hiện tại: <Box component="span" sx={{ color: "#2563eb" }}>{statusTitle}</Box>
            </Typography>
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
                bgcolor: "#f8fafc",
              }}
            >
              <EventAvailableIcon sx={{ color: "#94a3b8", fontSize: 28 }} />
              <Typography sx={{ color: "#64748b", pt: 1.25 }}>{emptyText}</Typography>
            </Paper>
          ) : (
            <Stack spacing={1.25}>
              {items.map((row, index) => {
                const id = row?.id ?? row?.consultationId ?? `${activeStatus}-${index}`;
                const status = String(row?.status || activeStatus).toLowerCase();
                const parentName = pickDisplayName(row);
                return (
                  <Paper
                    key={id}
                    variant="outlined"
                    sx={{
                      p: 1.75,
                      borderRadius: 2.25,
                      borderColor: "rgba(148,163,184,0.35)",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        borderColor: "rgba(37,99,235,0.4)",
                        boxShadow: "0 8px 22px rgba(15,23,42,0.08)",
                        transform: "translateY(-1px)",
                      },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                          <Avatar sx={{ width: 34, height: 34, bgcolor: "#dbeafe", color: "#1d4ed8" }}>
                            <PersonOutlineIcon fontSize="small" />
                          </Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              sx={{
                                fontWeight: 700,
                                color: "#0f172a",
                                fontSize: 15,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {parentName}
                            </Typography>
                          </Box>
                        </Box>
                        <Divider sx={{ my: 1 }} />
                        <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.7 }}>
                            <SchoolOutlinedIcon sx={{ fontSize: 16, color: "#64748b" }} />
                            <Typography sx={{ fontSize: 13, color: "#334155" }}>
                              Học sinh: {pickStudentName(row) || "Chưa có thông tin"}
                            </Typography>
                          </Box>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.7 }}>
                            <AccessTimeIcon sx={{ fontSize: 16, color: "#64748b" }} />
                            <Typography sx={{ fontSize: 13, color: "#334155" }}>
                              {pickScheduleTime(row)}
                            </Typography>
                          </Box>
                        </Stack>
                      </Box>
                      <Chip
                        label={STATUS_LABELS[status] || status}
                        color={STATUS_CHIP_COLORS[status] || "default"}
                        size="small"
                        sx={{ fontWeight: 700, alignSelf: "flex-start" }}
                      />
                    </Box>
                  </Paper>
                );
              })}
            </Stack>
          )}

          <Box sx={{ mt: 2.25, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
            <Typography sx={{ fontSize: 13, color: "#64748b" }}>
              Trang {page + 1} / {Math.max(1, totalPages)}
            </Typography>
            <Pagination
              count={Math.max(1, totalPages)}
              page={page + 1}
              onChange={(_, value) => setPage(Math.max(0, value - 1))}
              color="primary"
              shape="rounded"
              size="small"
            />
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
