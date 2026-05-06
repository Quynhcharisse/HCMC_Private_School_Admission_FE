import React from "react";
import { Box, Button, Card, CardContent, Chip, Divider, Stack, Typography } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import { useNavigate } from "react-router-dom";
import { isWorkingConfigMeaningful } from "../../../utils/schoolWideWorkingConfig.js";
import {
  canonicalizeWorkShiftName,
  formatShiftDisplayLine,
  WORK_SHIFT_TYPE_CODES,
} from "../../../utils/workShiftPolicy.js";

const DAY_LABELS = {
  MON: "Thứ 2",
  TUE: "Thứ 3",
  WED: "Thứ 4",
  THU: "Thứ 5",
  FRI: "Thứ 6",
  SAT: "Thứ 7",
  SUN: "Chủ nhật",
};

function formatShiftLine(s) {
  if (!s || typeof s !== "object") return "";
  const raw = s.name ?? s.shiftName ?? s.shift_name ?? "";
  const st = s.startTime ?? s.start_time ?? "";
  const en = s.endTime ?? s.end_time ?? "";
  const code = canonicalizeWorkShiftName(raw);
  if (WORK_SHIFT_TYPE_CODES.includes(code)) {
    return formatShiftDisplayLine(code, st, en);
  }
  if (st && en) return `${String(raw || "Ca")}: ${st} – ${en}`;
  return String(raw || "—");
}

function parseShiftLine(line) {
  const safe = String(line || "").trim();
  if (!safe) return { label: "Ca", time: "—" };
  const idx = safe.indexOf(":");
  if (idx > -1) {
    return {
      label: safe.slice(0, idx).trim() || "Ca",
      time: safe.slice(idx + 1).trim() || "—",
    };
  }
  return { label: safe, time: "—" };
}

/**
 * Khối chỉ đọc: lịch làm việc / ca do trường cấu hình (áp dụng chung mọi cơ sở).
 * @param {{
 *   workingConfig: { note?: string, workShifts?: unknown[], regularDays?: string[], weekendDays?: string[], isOpenSunday?: boolean },
 *   showSchoolOperationCta?: boolean
 * }} props
 */
export default function SchoolWideScheduleReadOnlyPanel({ workingConfig, showSchoolOperationCta = false }) {
  const navigate = useNavigate();
  const wc = workingConfig || {};
  const has = isWorkingConfigMeaningful(wc);

  return (
    <Card
      sx={{
        borderRadius: "18px",
        border: "1px solid #E2E8F0",
        boxShadow: "0 10px 28px rgba(15, 23, 42, 0.06)",
        bgcolor: "#FFFFFF",
        transition: "box-shadow .2s ease",
        "&:hover": {
          boxShadow: "0 14px 30px rgba(15, 23, 42, 0.1)",
        },
      }}
    >
      <CardContent sx={{ p: { xs: 3, md: 3.5 } }}>
        <Stack spacing={2.25}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <LockOutlinedIcon sx={{ fontSize: 18, color: "#64748B", opacity: 0.55 }} aria-hidden />
              <Typography sx={{ fontWeight: 800, color: "#0F172A", fontSize: "1.03rem" }}>
                Giờ làm việc & ca (áp dụng cho mọi cơ sở)
              </Typography>
            </Stack>
            <Chip
              size="small"
              label="Chung trường"
              sx={{
                fontWeight: 700,
                bgcolor: "rgba(37, 99, 235, 0.1)",
                color: "#2563EB",
                border: "none",
              }}
            />
          </Stack>
          <Typography variant="body2" sx={{ color: "#64748B", lineHeight: 1.6 }}>
            Áp dụng chung cho toàn bộ cơ sở. Chỉ quản lý cấp trường có thể chỉnh sửa.
          </Typography>
          <Divider />

        {!has ? (
          <Box
            sx={{
              py: 3.5,
              px: 2,
              borderRadius: 2,
              bgcolor: "#F8FAFC",
              border: "1px dashed #CBD5E1",
              textAlign: "center",
            }}
          >
            <CalendarMonthOutlinedIcon sx={{ fontSize: 38, color: "#94A3B8", mb: 1 }} />
            <Typography sx={{ color: "#0F172A", fontWeight: 700, mb: 0.5 }}>
              Chưa có cấu hình giờ làm việc
            </Typography>
            <Typography variant="body2" sx={{ color: "#64748B", mb: showSchoolOperationCta ? 2 : 0 }}>
              Vui lòng cấu hình tại hệ thống quản lý trường
            </Typography>
            {showSchoolOperationCta ? (
              <Button
                variant="contained"
                size="small"
                onClick={() => navigate("/school/facility-config?tab=operation")}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  borderRadius: "10px",
                  bgcolor: "#2563EB",
                  "&:hover": { bgcolor: "#1D4ED8" },
                }}
              >
                Cấu hình tại trang vận hành
              </Button>
            ) : (
              <Typography variant="caption" sx={{ color: "#94A3B8" }}>
                Do trường cấu hình — liên hệ trụ sở nếu cần chỉnh sửa.
              </Typography>
            )}
          </Box>
        ) : (
          <Stack spacing={2}>
            <Box sx={{ p: 1.75, borderRadius: 2, bgcolor: "#F8FAFC" }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748B", display: "block", mb: 0.8 }}>
                Trong tuần
              </Typography>
              <Stack direction="row" flexWrap="wrap" useFlexGap sx={{ gap: 0.75, mb: 1.25 }}>
                {(wc.regularDays || []).map((code) => (
                  <Chip
                    key={`r-${code}`}
                    size="small"
                    label={DAY_LABELS[String(code).toUpperCase()] || code}
                    sx={{
                      bgcolor: "rgba(37,99,235,0.08)",
                      color: "#1E40AF",
                      fontWeight: 700,
                      borderRadius: "8px",
                      "&:hover": { bgcolor: "rgba(37,99,235,0.14)" },
                    }}
                  />
                ))}
              </Stack>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748B", display: "block", mb: 0.8 }}>
                Cuối tuần
              </Typography>
              <Stack direction="row" flexWrap="wrap" useFlexGap sx={{ gap: 0.75 }}>
                {(wc.weekendDays || []).map((code) => (
                  <Chip
                    key={`w-${code}`}
                    size="small"
                    label={DAY_LABELS[String(code).toUpperCase()] || code}
                    sx={{
                      bgcolor: "rgba(148,163,184,0.14)",
                      color: "#334155",
                      fontWeight: 700,
                      borderRadius: "8px",
                      "&:hover": { bgcolor: "rgba(148,163,184,0.2)" },
                    }}
                  />
                ))}
                {(!wc.regularDays || wc.regularDays.length === 0) &&
                (!wc.weekendDays || wc.weekendDays.length === 0) ? (
                  <Typography variant="body2" sx={{ color: "#94A3B8" }}>
                    — Chưa khai báo thứ cụ thể
                  </Typography>
                ) : null}
              </Stack>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" sx={{ color: "#64748B", fontWeight: 700 }}>
                Chủ nhật:
              </Typography>
              <Box
                component="span"
                sx={{
                  px: 1.1,
                  py: 0.4,
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  bgcolor: wc.isOpenSunday ? "rgba(34,197,94,0.14)" : "rgba(239,68,68,0.12)",
                  color: wc.isOpenSunday ? "#166534" : "#B91C1C",
                }}
              >
                {wc.isOpenSunday ? "Mở cửa" : "Đóng"}
              </Box>
            </Stack>

            <Box sx={{ p: 1.75, borderRadius: 2, bgcolor: "#F8FAFC" }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748B", display: "block", mb: 0.9 }}>
                Ca làm việc
              </Typography>
              {Array.isArray(wc.workShifts) && wc.workShifts.length > 0 ? (
                <Stack spacing={0.8}>
                  {wc.workShifts.map((sh, i) => {
                    const line = formatShiftLine(sh);
                    if (!line) return null;
                    const parts = parseShiftLine(line);
                    return (
                      <Stack
                        key={i}
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{ py: 0.85, borderBottom: i === wc.workShifts.length - 1 ? "none" : "1px solid #E2E8F0" }}
                      >
                        <Typography variant="body2" sx={{ color: "#0F172A", fontWeight: 700 }}>
                          {parts.label}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#334155", fontWeight: 600 }}>
                          {parts.time}
                        </Typography>
                      </Stack>
                    );
                  })}
                </Stack>
              ) : (
                <Typography variant="body2" sx={{ color: "#94A3B8" }}>
                  Chưa có danh sách ca.
                </Typography>
              )}
            </Box>

            {wc.note ? (
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "#F8FAFC", borderLeft: "3px solid #2563EB" }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: "#2563EB", display: "block", mb: 0.5 }}>
                  Ghi chú
                </Typography>
                <Typography variant="body2" sx={{ color: "#334155", whiteSpace: "pre-wrap" }}>
                  {wc.note}
                </Typography>
              </Box>
            ) : null}

            {showSchoolOperationCta ? (
              <Button
                variant="text"
                size="small"
                onClick={() => navigate("/school/facility-config?tab=operation")}
                sx={{ textTransform: "none", fontWeight: 700, alignSelf: "flex-start", color: "#2563EB" }}
              >
                Cấu hình tại trang vận hành →
              </Button>
            ) : null}
          </Stack>
        )}
        </Stack>
      </CardContent>
    </Card>
  );
}
