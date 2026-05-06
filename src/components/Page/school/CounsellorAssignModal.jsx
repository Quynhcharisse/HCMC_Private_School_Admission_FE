import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { enqueueSnackbar } from "notistack";
import {
  getCounsellorAssignedSlots,
  getCounsellorAvailableList,
  isCounsellorAssignResponseSuccess,
  parseCounsellorAssignedSlotsBody,
  parseCounsellorAssignSuccessBody,
  parseCounsellorAvailableListBody,
  postCounsellorAssign,
} from "../../../services/CampusCounsellorScheduleService.jsx";
import { getHolidayList, extractHolidayListBody } from "../../../services/SchoolHolidayService.jsx";
import {
  isAcademicCalendarLimitActive,
  normalizeAcademicCalendarShape,
  termIsComplete,
  validateAssignDateRangeAgainstAcademicTerms,
} from "../../../utils/academicCalendarUi.js";
import {
  listBlockingHolidayLabelsInRange,
  mapCounsellorAssignApiErrorMessage,
  validateCounsellorCountForAssign,
} from "../../../utils/counsellorAssignUi.js";
import { getCampaignTemplatesByYear } from "../../../services/CampaignService.jsx";

const PRIMARY = "#0D64DE";

const DAY_LABELS_VI = {
  MON: "Thứ 2",
  TUE: "Thứ 3",
  WED: "Thứ 4",
  THU: "Thứ 5",
  FRI: "Thứ 6",
  SAT: "Thứ 7",
  SUN: "Chủ nhật",
};

function modalSessionTypeLabel(s) {
  const v = String(s || "").toUpperCase();
  if (v === "MORNING") return "Buổi sáng";
  if (v === "AFTERNOON") return "Buổi chiều";
  if (v === "EVENING") return "Buổi tối";
  if (v === "FULL_DAY") return "Cả ngày";
  return s || "—";
}

function counsellorDisplayLabel(c) {
  const n = c?.name != null && String(c.name).trim() !== "" ? String(c.name).trim() : "";
  if (n) return n;
  return c?.email ? String(c.email) : `ID ${c?.id ?? "—"}`;
}

function counsellorInitials(c) {
  const label = counsellorDisplayLabel(c);
  const parts = label.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return label.slice(0, 2).toUpperCase() || "?";
}

function formatYmdVi(ymd) {
  const s = ymd != null ? String(ymd).trim() : "";
  if (s.length < 8) return s;
  const p = s.slice(0, 10).split("-").map((x) => Number(x));
  if (p.length !== 3 || p.some((n) => !Number.isFinite(n))) return s;
  const d = new Date(p[0], p[1] - 1, p[2]);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Trích gợi ý tên từ message lỗi kiểu "Counsellor B is busy" */
function parseBusyCounsellorHints(message) {
  const m = String(message || "");
  const hints = [];
  const re = /Counsellor\s+([^,.\n]+?)\s+is\s+busy/gi;
  let x;
  while ((x = re.exec(m)) !== null) {
    hints.push(x[1].trim());
  }
  return hints;
}

function rowMatchesBusyHint(c, hints) {
  if (!hints.length) return false;
  const label = counsellorDisplayLabel(c).toLowerCase();
  const email = (c?.email && String(c.email).toLowerCase()) || "";
  return hints.some((h) => {
    const t = String(h).toLowerCase().trim();
    if (!t) return false;
    return label.includes(t) || t.includes(label) || (email && (email.includes(t) || t.includes(email)));
  });
}

function normalizeCampaignStatus(rawStatus) {
  const s = String(rawStatus || "").trim().toUpperCase();
  if (!s) return "DRAFT";
  if (s === "OPEN" || s === "OPEN_ADMISSION_CAMPAIGN") return "OPEN";
  if (s === "CANCELLED" || s === "CANCELLED_ADMISSION_CAMPAIGN") return "CANCELLED";
  if (s === "DRAFT" || s === "DRAFT_ADMISSION_CAMPAIGN") return "DRAFT";
  return s;
}

function campaignIdOf(row) {
  const id = Number(row?.admissionCampaignTemplateId ?? row?.campaignId ?? row?.id);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function extractCampaignTemplateRows(res) {
  const raw = res?.data?.body ?? res?.data;
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    if (Array.isArray(raw.campaigns)) return raw.campaigns;
    if (raw.id != null || raw.admissionCampaignTemplateId != null) return [raw];
  }
  return [];
}

function assignedRowsForTemplateDay(assignedRows, templateId, dayOfWeekKey) {
  const tid = Number(templateId);
  if (!Number.isFinite(tid) || tid <= 0 || !dayOfWeekKey) return [];
  const dow = String(dayOfWeekKey).toUpperCase();
  return (assignedRows || []).filter((row) => {
    const sch = row?.schedule;
    if (!sch) return false;
    const rtid = Number(sch.templateId ?? sch.template_id);
    const rdow = String(sch.dayOfWeek ?? sch.day_of_week ?? "").toUpperCase();
    return rtid === tid && rdow === dow;
  });
}

function counsellorIdsFromAssignedRows(rows) {
  const ids = new Set();
  for (const row of rows) {
    const cid = row?.counsellor?.id ?? row?.counsellor_id;
    if (cid == null || cid === "") continue;
    const n = Number(cid);
    if (Number.isFinite(n)) ids.add(n);
  }
  return ids;
}

/** Giao các tập id đã gán trên từng cặp (templateId + thứ) — dùng gợi ý chọn khi gán batch */
function counsellorIntersectionAcrossPairs(assignedRows, pairs) {
  if (!Array.isArray(pairs) || pairs.length === 0) return new Set();
  const sets = pairs.map(({templateId, dayOfWeekKey}) =>
    counsellorIdsFromAssignedRows(assignedRowsForTemplateDay(assignedRows, templateId, dayOfWeekKey))
  );
  let acc = sets[0];
  for (let i = 1; i < sets.length; i++) {
    acc = new Set([...acc].filter((id) => sets[i].has(id)));
  }
  return acc;
}

export default function CounsellorAssignModal({
  open,
  onClose,
  campusId,
  templateId,
  /** Gán hàng loạt: nhiều template; ưu tiên hơn một templateId đơn */
  batchSlots = null,
  dayOfWeekKey,
  dayOfWeek,
  startTime,
  endTime,
  sessionTypeLabelText,
  defaultStartDate,
  defaultEndDate,
  minCounsellorsPerSlot = 1,
  maxCounsellorsPerSlot = 0,
  /** Phụ huynh / booking — khác hẳn tối thiểu–tối đa tư vấn viên bên dưới */
  maxBookingPerSlot = 1,
  /** Chuẩn hoá từ GET campus/config */
  academicCalendar: academicCalendarProp,
  academicSemesterLimitActive = false,
  /** Sau HTTP 2xx: nhận kết quả parse body.slots (nếu có); parent ưu tiên merge, không thì refetch GET assigned */
  onSuccess,
}) {
  const academicCalendar = useMemo(
    () => normalizeAcademicCalendarShape(academicCalendarProp),
    [academicCalendarProp]
  );

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [rowConflict, setRowConflict] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [rangeError, setRangeError] = useState("");
  const [holidayWarningLabels, setHolidayWarningLabels] = useState([]);
  const [campaignOptions, setCampaignOptions] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  /** Chế độ «trọn phạm vi học kỳ trên máy chủ» vs nhập tay — chỉ ASSIGN khi đã bật HK đủ term */
  const [useCustomDateRange, setUseCustomDateRange] = useState(true);

  const semesterLimitForUi = academicSemesterLimitActive && isAcademicCalendarLimitActive(academicCalendar);

  const schedulePairs = useMemo(() => {
    if (Array.isArray(batchSlots) && batchSlots.length > 0) {
      return batchSlots.map(({slot, day}) => ({
        templateId: slot?.id ?? slot?.templateId,
        dayOfWeekKey: day,
      }));
    }
    const tid = templateId != null ? Number(templateId) : NaN;
    if (Number.isFinite(tid) && tid > 0 && dayOfWeekKey) {
      return [{templateId: tid, dayOfWeekKey: String(dayOfWeekKey).toUpperCase()}];
    }
    return [];
  }, [batchSlots, templateId, dayOfWeekKey]);

  /** Mỗi ô đã chọn một phần tử (có thể trùng templateId khác ngày) — khớp batch BE */
  const templateIdsForPayload = useMemo(() => {
    return schedulePairs.map((p) => Number(p.templateId)).filter((n) => Number.isFinite(n) && n > 0);
  }, [schedulePairs]);

  const isBatchAssign = templateIdsForPayload.length > 1;

  useEffect(() => {
    if (!open) return;
    setRowConflict({});
    setRangeError("");
    setHolidayWarningLabels([]);
    setCampaignOptions([]);
    setSelectedCampaignId("");

    const semesterOn = academicSemesterLimitActive && isAcademicCalendarLimitActive(academicCalendar);
    setUseCustomDateRange(!semesterOn);
    setStartDate(semesterOn ? "" : defaultStartDate || "");
    setEndDate(semesterOn ? "" : defaultEndDate || "");
    setLoading(true);

    Promise.all([
      getCounsellorAvailableList().then((res) => {
        const st = res?.status ?? 0;
        return st >= 200 && st < 300 ? parseCounsellorAvailableListBody(res) : [];
      }),
      getCounsellorAssignedSlots().then((res) => {
        const st = res?.status ?? 0;
        return st >= 200 && st < 300 ? parseCounsellorAssignedSlotsBody(res) : [];
      }),
      getHolidayList()
        .then((res) => {
          const st = res?.status ?? 0;
          return st >= 200 && st < 300 ? extractHolidayListBody(res) : [];
        })
        .catch(() => []),
      getCampaignTemplatesByYear(new Date().getFullYear())
        .then((res) => {
          const st = res?.status ?? 0;
          if (st < 200 || st >= 300) return [];
          return extractCampaignTemplateRows(res);
        })
        .catch(() => []),
    ])
      .then(([availableList, assignedRows, holidays, campaigns]) => {
        setList(Array.isArray(availableList) ? availableList : []);
        const pre = counsellorIntersectionAcrossPairs(assignedRows, schedulePairs);
        setSelected(pre);
        setHolidayWarningLabels(Array.isArray(holidays) ? holidays : []);
        const normalizedCampaigns = (Array.isArray(campaigns) ? campaigns : [])
          .map((raw) => {
            const id = campaignIdOf(raw);
            if (id == null) return null;
            const status = normalizeCampaignStatus(raw?.status);
            return {
              id,
              name: String(raw?.name ?? raw?.campaignName ?? `Chiến dịch #${id}`),
              status,
            };
          })
          .filter(Boolean);
        const openFirst = normalizedCampaigns
          .sort((a, b) => {
            const ra = a.status === "OPEN" ? 0 : 1;
            const rb = b.status === "OPEN" ? 0 : 1;
            return ra - rb || a.name.localeCompare(b.name, "vi");
          });
        setCampaignOptions(openFirst);
        const defaultCampaign = openFirst.find((c) => c.status === "OPEN") ?? openFirst[0] ?? null;
        setSelectedCampaignId(defaultCampaign ? String(defaultCampaign.id) : "");
      })
      .catch(() => {
        setList([]);
        setSelected(new Set());
        enqueueSnackbar("Không tải được danh sách tư vấn viên hoặc lịch gán.", { variant: "error" });
      })
      .finally(() => setLoading(false));
  }, [
    open,
    defaultStartDate,
    defaultEndDate,
    campusId,
    templateId,
    dayOfWeekKey,
    academicSemesterLimitActive,
    academicCalendar,
    schedulePairs,
  ]);

  const blockingHolidayHints = useMemo(() => {
    if (!startDate || !endDate) return [];
    return listBlockingHolidayLabelsInRange(holidayWarningLabels, startDate, endDate);
  }, [holidayWarningLabels, startDate, endDate]);

  const hkLine = useMemo(() => {
    if (!academicSemesterLimitActive || !isAcademicCalendarLimitActive(academicCalendar)) {
      return null;
    }
    const parts = [];
    if (termIsComplete(academicCalendar.term1)) {
      parts.push(
        `${formatYmdVi(academicCalendar.term1.start)} – ${formatYmdVi(academicCalendar.term1.end)} (HK1)`
      );
    }
    if (termIsComplete(academicCalendar.term2)) {
      parts.push(
        `${formatYmdVi(academicCalendar.term2.start)} – ${formatYmdVi(academicCalendar.term2.end)} (HK2)`
      );
    }
    return parts.length ? parts.join(" · ") : null;
  }, [academicSemesterLimitActive, academicCalendar]);

  const toggleId = (rawId) => {
    const id = Number(rawId);
    if (!Number.isFinite(id)) return;
    setRowConflict((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const validateRangeCommon = () => {
    if (!startDate || !endDate) {
      setRangeError("Chọn ngày bắt đầu và kết thúc.");
      return false;
    }
    if (startDate > endDate) {
      setRangeError("Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.");
      return false;
    }
    setRangeError("");
    return true;
  };

  const handleAssign = async () => {
    setRowConflict({});
    const useNullDatesForAssign = semesterLimitForUi && !useCustomDateRange;

    if (!useNullDatesForAssign) {
      if (!validateRangeCommon()) return;
      const hkCheck = validateAssignDateRangeAgainstAcademicTerms(
        startDate,
        endDate,
        academicCalendar,
        academicSemesterLimitActive
      );
      if (!hkCheck.ok) {
        setRangeError(hkCheck.message || "");
        enqueueSnackbar(hkCheck.message || "Khoảng ngày không hợp lệ.", { variant: "warning" });
        return;
      }
    } else {
      setRangeError("");
    }

    const cnt = validateCounsellorCountForAssign(minCounsellorsPerSlot, maxCounsellorsPerSlot, selected.size);
    if (!cnt.ok) {
      enqueueSnackbar(cnt.message, { variant: "warning" });
      return;
    }
    if (selected.size === 0) {
      enqueueSnackbar("Chọn ít nhất một tư vấn viên.", { variant: "warning" });
      return;
    }
    if (templateIdsForPayload.length === 0) {
      enqueueSnackbar("Thiếu khung template — không gửi được.", { variant: "error" });
      return;
    }
    const cid = Number(selectedCampaignId);
    if (!Number.isFinite(cid) || cid <= 0) {
      enqueueSnackbar("Chọn chiến dịch trước khi gán tư vấn viên.", { variant: "warning" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await postCounsellorAssign({
        campusId: Number(campusId),
        counsellorIds: [...selected].filter((x) => Number.isFinite(Number(x))).map(Number),
        campaignId: cid,
        action: "ASSIGN",
        templateIds: templateIdsForPayload,
        ...(useNullDatesForAssign ? { startDate: null, endDate: null } : { startDate, endDate }),
      });
      const ok = isCounsellorAssignResponseSuccess(res);
      if (ok) {
        enqueueSnackbar(
          isBatchAssign
            ? `Đã gán ${templateIdsForPayload.length} khung giờ (cùng tư vấn viên đã chọn).`
            : "Đã gán tư vấn viên vào khung giờ.",
          {
            variant: "success",
          }
        );
        onSuccess?.(parseCounsellorAssignSuccessBody(res));
        onClose();
      } else {
        const rawFail = res?.data?.message ?? "";
        const hintsFail = parseBusyCounsellorHints(rawFail);
        const nextFail = {};
        for (const c of list) {
          const cid = Number(c.id);
          if (Number.isFinite(cid) && selected.has(cid) && rowMatchesBusyHint(c, hintsFail)) {
            nextFail[cid] = rawFail || "Tư vấn viên bận lịch";
          }
        }
        if (Object.keys(nextFail).length > 0) {
          setRowConflict(nextFail);
          enqueueSnackbar("Một số tư vấn viên không thể gán. Xem dòng được đánh dấu.", { variant: "warning" });
        } else {
          enqueueSnackbar(mapCounsellorAssignApiErrorMessage(rawFail), { variant: "error" });
        }
      }
    } catch (e) {
      const raw = e?.response?.data?.message ?? e?.message ?? "";
      const hints = parseBusyCounsellorHints(raw);
      const next = {};
      for (const c of list) {
        const cid = Number(c.id);
        if (Number.isFinite(cid) && selected.has(cid) && rowMatchesBusyHint(c, hints)) {
          next[cid] = raw || "Tư vấn viên bận lịch";
        }
      }
      if (Object.keys(next).length > 0) {
        setRowConflict(next);
        enqueueSnackbar("Một số tư vấn viên không thể gán. Xem dòng được đánh dấu.", { variant: "warning" });
      } else {
        enqueueSnackbar(mapCounsellorAssignApiErrorMessage(raw), { variant: "error" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={(event, reason) => {
        if (reason === "backdropClick") return;
        if (!submitting) onClose();
      }}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: "16px" } }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pr: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {isBatchAssign ? `Gán tư vấn viên (${templateIdsForPayload.length} khung)` : "Gán tư vấn viên"}
          </Typography>
          {semesterLimitForUi ? (
            <Chip size="small" label="Giới hạn theo học kỳ" color="info" variant="outlined" />
          ) : null}
        </Stack>
        <IconButton onClick={() => !submitting && onClose()} size="small" aria-label="Đóng">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2.5 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems="stretch">
          <Box
            sx={{
              flex: "0 0 260px",
              p: 2,
              borderRadius: "12px",
              bgcolor: "#F8FAFC",
              border: "1px solid #E2E8F0",
              maxHeight: 360,
              overflow: "auto",
            }}
          >
            <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600, textTransform: "uppercase" }}>
              Khung giờ (chỉ đọc)
            </Typography>
            {isBatchAssign && Array.isArray(batchSlots) && batchSlots.length > 1 ? (
              <>
                <Typography sx={{ fontWeight: 700, mt: 1, color: "#0F172A" }}>{batchSlots.length} khung đã chọn</Typography>
                <Stack component="ul" spacing={0.75} sx={{ m: 0, mt: 1, pl: 2.25 }}>
                  {batchSlots.map(({slot, day}, idx) => (
                    <Typography key={`${slot?.id ?? idx}-${day}`} component="li" variant="body2" sx={{ color: "#334155" }}>
                      {DAY_LABELS_VI[day] || day}: {slot?.startTime} – {slot?.endTime} · {modalSessionTypeLabel(slot?.sessionType)}
                    </Typography>
                  ))}
                </Stack>
              </>
            ) : (
              <>
                <Typography sx={{ fontWeight: 700, mt: 1, color: "#0F172A" }}>{dayOfWeek}</Typography>
                <Typography sx={{ fontWeight: 600, mt: 0.5, color: "#334155" }}>
                  {startTime} – {endTime}
                </Typography>
                <Typography variant="body2" sx={{ color: "#64748B", mt: 0.5 }}>
                  {sessionTypeLabelText}
                </Typography>
              </>
            )}
          </Box>

          <Stack spacing={2.5} sx={{ flex: 1, minWidth: 0 }}>
            {semesterLimitForUi && hkLine ? (
              <Alert severity="info" variant="outlined" sx={{ borderRadius: 2 }}>
                <Typography variant="body2" sx={{ lineHeight: 1.55 }}>
                  Khi bật giới hạn học kỳ, có thể gán trọn phạm vi đã cấu hình mà không cần nhập ngày; hoặc bật «Tùy chỉnh khoảng
                  ngày» để chọn khoảng ngắn hơn. Phạm vi đang cấu hình: <strong>{hkLine}</strong>
                </Typography>
              </Alert>
            ) : null}

            {semesterLimitForUi ? (
              <FormControlLabel
                control={
                  <Switch
                    checked={useCustomDateRange}
                    onChange={(_, checked) => {
                      setUseCustomDateRange(checked);
                      if (!checked) {
                        setStartDate("");
                        setEndDate("");
                      } else {
                        setStartDate((s) => s || defaultStartDate || "");
                        setEndDate((e) => e || defaultEndDate || "");
                      }
                      setRangeError("");
                    }}
                    disabled={submitting}
                  />
                }
                label={
                  <Typography variant="body2" component="span">
                    Tùy chỉnh khoảng ngày (nhập Từ / Đến và gửi lên máy chủ)
                  </Typography>
                }
              />
            ) : null}

            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#374151" }}>
              Khoảng thời gian gán
            </Typography>
            <FormControl fullWidth size="small">
              <InputLabel id="assign-campaign-label">Chiến dịch</InputLabel>
              <Select
                labelId="assign-campaign-label"
                value={selectedCampaignId}
                label="Chiến dịch"
                onChange={(e) => setSelectedCampaignId(String(e.target.value || ""))}
                disabled={submitting || loading}
              >
                {campaignOptions.length === 0 ? (
                  <MenuItem value="">Không có chiến dịch khả dụng</MenuItem>
                ) : (
                  campaignOptions.map((c) => (
                    <MenuItem key={c.id} value={String(c.id)}>
                      {c.name} {c.status === "OPEN" ? "(Đang mở)" : ""}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
            {semesterLimitForUi && !useCustomDateRange ? (
              <Typography variant="body2" sx={{ color: "#475569", lineHeight: 1.55 }}>
                Đang chọn gán theo học kỳ: không cần nhập Từ / Đến — máy chủ tự áp dụng phạm vi học kỳ đã cấu hình.
              </Typography>
            ) : (
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Từ ngày"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setRangeError("");
                  }}
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                  error={!!rangeError}
                />
                <TextField
                  label="Đến ngày"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setRangeError("");
                  }}
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                  error={!!rangeError}
                />
              </Stack>
            )}
            {rangeError ? (
              <Typography variant="caption" color="error">
                {rangeError}
              </Typography>
            ) : null}

            {blockingHolidayHints.length > 0 ? (
              <Alert severity="warning" variant="outlined" sx={{ borderRadius: 2 }}>
                <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                  Khoảng ngày giao với ngày nghỉ / chặn vận hành: {blockingHolidayHints.join("; ")}. Kiểm tra lại trước khi gửi.
                </Typography>
              </Alert>
            ) : null}

            <>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#374151" }}>
                  Chọn tư vấn viên
                </Typography>
                <Typography variant="caption" sx={{ color: "#64748B", display: "block", mt: -0.5, mb: 0.5, lineHeight: 1.5 }}>
                  Phụ huynh / đặt chỗ: tối đa <strong>{maxBookingPerSlot}</strong> lượt trong một khung (booking) — khác hẳn số tư
                  vấn viên khi gán lịch bên dưới.
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: "#64748B", display: "block", mb: 0.75, lineHeight: 1.5 }}
                >
                  Gán lịch cho tư vấn viên: áp dụng tối thiểu / tối đa dưới đây (cấu hình vận hành) —{" "}
                  <em>không</em> dùng số booking ở dòng trên.
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: "#475569", display: "block", mb: 0.5, lineHeight: 1.45, fontWeight: 600 }}
                >
                  Đang áp dụng: tối thiểu <strong>{minCounsellorsPerSlot}</strong>
                  {maxCounsellorsPerSlot > 0 ? (
                    <>
                      {" "}
                      · tối đa <strong>{maxCounsellorsPerSlot}</strong> tư vấn viên cùng khung và khoảng ngày.
                    </>
                  ) : (
                    <> · không giới hạn trần số tư vấn viên (0).</>
                  )}
                </Typography>
                {loading ? (
                  <Typography variant="body2" color="text.secondary">
                    Đang tải…
                  </Typography>
                ) : list.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Không có tư vấn viên khả dụng.
                  </Typography>
                ) : (
                  <Stack spacing={1} sx={{ maxHeight: 280, overflow: "auto", pr: 0.5 }}>
                    {list.map((c) => {
                      const id = Number(c.id);
                      const checked = Number.isFinite(id) && selected.has(id);
                      const conflict = rowConflict[id];
                      return (
                        <Box
                          key={String(c.id)}
                          sx={{
                            p: 1.25,
                            borderRadius: "10px",
                            border: `1px solid ${conflict ? "#FCA5A5" : "#E5E7EB"}`,
                            bgcolor: conflict ? "#FEF2F2" : "#fff",
                            transition: "background 0.2s, border-color 0.2s",
                          }}
                        >
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={checked}
                                onChange={() => toggleId(id)}
                                disabled={submitting}
                                sx={{ "&.Mui-checked": { color: PRIMARY } }}
                              />
                            }
                            label={
                              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 0.25 }}>
                                <Avatar
                                  sx={{
                                    width: 36,
                                    height: 36,
                                    fontSize: "0.85rem",
                                    bgcolor: conflict ? "#DC2626" : PRIMARY,
                                  }}
                                >
                                  {counsellorInitials(c)}
                                </Avatar>
                                <Box>
                                  <Typography sx={{ fontWeight: 600, fontSize: "0.9rem" }}>
                                    {counsellorDisplayLabel(c)}
                                  </Typography>
                                  {c.email ? (
                                    <Typography variant="caption" sx={{ color: "#64748B", display: "block" }}>
                                      {c.email}
                                    </Typography>
                                  ) : null}
                                </Box>
                              </Stack>
                            }
                            sx={{ alignItems: "center", m: 0, width: "100%" }}
                          />
                          {conflict ? (
                            <Typography variant="caption" sx={{ color: "#B91C1C", display: "block", mt: 0.5, pl: 1 }}>
                              {conflict}
                            </Typography>
                          ) : null}
                        </Box>
                      );
                    })}
                  </Stack>
                )}
            </>
          </Stack>
        </Stack>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={() => !submitting && onClose()} sx={{ textTransform: "none", color: "#64748B" }}>
          Hủy
        </Button>
        <Button
          variant="contained"
          onClick={handleAssign}
          disabled={submitting || loading}
          sx={{
            textTransform: "none",
            fontWeight: 600,
            borderRadius: "10px",
            bgcolor: PRIMARY,
            boxShadow: "none",
            "&:hover": { bgcolor: "#0a52bd", boxShadow: "none" },
          }}
        >
          Gán ngay
        </Button>
      </DialogActions>
    </Dialog>
  );
}
