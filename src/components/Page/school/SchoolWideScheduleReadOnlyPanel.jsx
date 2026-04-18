import React from "react";
import { Box, Button, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
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
        borderRadius: "12px",
        border: "1px solid rgba(148, 163, 184, 0.35)",
        boxShadow: "none",
        bgcolor: "rgba(248, 250, 252, 0.95)",
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
          <LockOutlinedIcon sx={{ fontSize: 20, color: "#64748B" }} aria-hidden />
          <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
            Giờ làm việc & ca — theo cấu hình trường (áp dụng cho mọi cơ sở)
          </Typography>
          <Chip size="small" label="Chung trường" sx={{ fontWeight: 700, bgcolor: "rgba(100,116,139,0.12)", color: "#475569" }} />
        </Stack>
        <Typography variant="body2" sx={{ color: "#64748B", lineHeight: 1.65, mb: 2 }}>
          Cơ sở không chỉnh riêng giờ làm hay ca; mọi thay đổi do người quản lý cấp trường thực hiện và áp dụng đồng bộ. Tại
          đây chỉ xem — dữ liệu là quy định chung do trụ sở chính thiết lập.
        </Typography>

        {!has ? (
          <Box sx={{ py: 2 }}>
            <Typography variant="body2" sx={{ color: "#94A3B8", mb: 1.5 }}>
              Trường chưa thiết lập giờ làm việc / ca. Vui lòng yêu cầu quản trị trường cấu hình tại màn vận hành trụ sở.
            </Typography>
            {showSchoolOperationCta ? (
              <Button
                variant="outlined"
                size="small"
                onClick={() => navigate("/school/facility-config?tab=operation")}
                sx={{ textTransform: "none", fontWeight: 600, borderRadius: "10px" }}
              >
                Chỉnh tại Cấu hình vận hành trường
              </Button>
            ) : (
              <Typography variant="caption" sx={{ color: "#94A3B8" }}>
                Do trường cấu hình — liên hệ trụ sở nếu cần chỉnh sửa.
              </Typography>
            )}
          </Box>
        ) : (
          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748B", display: "block", mb: 0.75 }}>
                Ngày làm việc trong tuần
              </Typography>
              <Stack direction="row" flexWrap="wrap" useFlexGap sx={{ gap: 0.75 }}>
                {(wc.regularDays || []).map((code) => (
                  <Chip
                    key={`r-${code}`}
                    size="small"
                    label={DAY_LABELS[String(code).toUpperCase()] || code}
                    variant="outlined"
                    sx={{ borderColor: "#CBD5E1", color: "#475569" }}
                  />
                ))}
                {(wc.weekendDays || []).map((code) => (
                  <Chip
                    key={`w-${code}`}
                    size="small"
                    label={`Cuối tuần: ${DAY_LABELS[String(code).toUpperCase()] || code}`}
                    variant="outlined"
                    sx={{ borderColor: "#CBD5E1", color: "#475569" }}
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
            <Typography variant="body2" sx={{ color: "#475569" }}>
              <strong>Chủ nhật:</strong> {wc.isOpenSunday ? "Mở cửa" : "Không mở cửa"}
            </Typography>
            {wc.note ? (
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748B", display: "block", mb: 0.5 }}>
                  Ghi chú lịch
                </Typography>
                <Typography variant="body2" sx={{ color: "#334155", whiteSpace: "pre-wrap" }}>
                  {wc.note}
                </Typography>
              </Box>
            ) : null}
            {Array.isArray(wc.workShifts) && wc.workShifts.length > 0 ? (
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748B", display: "block", mb: 0.75 }}>
                  Ca làm việc
                </Typography>
                <Stack component="ul" sx={{ m: 0, pl: 2.25 }} spacing={0.35}>
                  {wc.workShifts.map((sh, i) => {
                    const line = formatShiftLine(sh);
                    return line ? (
                      <Typography key={i} component="li" variant="body2" sx={{ color: "#334155" }}>
                        {line}
                      </Typography>
                    ) : null;
                  })}
                </Stack>
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: "#94A3B8" }}>
                Chưa có danh sách ca.
              </Typography>
            )}
            {showSchoolOperationCta ? (
              <Button
                variant="text"
                size="small"
                onClick={() => navigate("/school/facility-config?tab=operation")}
                sx={{ textTransform: "none", fontWeight: 600, alignSelf: "flex-start", color: "#2563EB" }}
              >
                Chỉnh tại Cấu hình vận hành trường →
              </Button>
            ) : null}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
