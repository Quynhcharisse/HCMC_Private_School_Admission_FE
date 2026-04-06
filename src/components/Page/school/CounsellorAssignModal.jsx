import React, { useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { enqueueSnackbar } from "notistack";
import {
  getCounsellorAssignedSlots,
  getCounsellorAvailableList,
  parseCounsellorAssignedSlotsBody,
  parseCounsellorAvailableListBody,
  postCounsellorAssign,
} from "../../../services/CampusCounsellorScheduleService.jsx";

const PRIMARY = "#0D64DE";

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

/** Lọc bản ghi gán theo template + thứ (MON…SUN) để đánh dấu đã chọn trong modal */
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

export default function CounsellorAssignModal({
  open,
  onClose,
  campusId,
  templateId,
  /** MON, TUE, … — dùng khớp API slots/assigned với template */
  dayOfWeekKey,
  dayOfWeek,
  startTime,
  endTime,
  sessionTypeLabelText,
  defaultStartDate,
  defaultEndDate,
  onSuccess,
}) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [rowConflict, setRowConflict] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [rangeError, setRangeError] = useState("");

  useEffect(() => {
    if (!open) return;
    setStartDate(defaultStartDate || "");
    setEndDate(defaultEndDate || "");
    setRowConflict({});
    setRangeError("");
    setLoading(true);

    const cid = campusId != null && campusId !== "" ? Number(campusId) : null;
    const canLoadAssigned = cid != null && !Number.isNaN(cid);

    Promise.all([
      getCounsellorAvailableList().then((res) =>
        res?.status === 200 ? parseCounsellorAvailableListBody(res) : []
      ),
      canLoadAssigned
        ? getCounsellorAssignedSlots(cid).then((res) =>
            res?.status === 200 ? parseCounsellorAssignedSlotsBody(res) : []
          )
        : Promise.resolve([]),
    ])
      .then(([availableList, assignedRows]) => {
        setList(Array.isArray(availableList) ? availableList : []);
        const forSlot = assignedRowsForTemplateDay(assignedRows, templateId, dayOfWeekKey);
        setSelected(counsellorIdsFromAssignedRows(forSlot));
      })
      .catch(() => {
        setList([]);
        setSelected(new Set());
        enqueueSnackbar("Không tải được danh sách tư vấn viên hoặc lịch gán.", { variant: "error" });
      })
      .finally(() => setLoading(false));
  }, [open, defaultStartDate, defaultEndDate, campusId, templateId, dayOfWeekKey]);

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

  const validateRange = () => {
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
    if (!validateRange()) return;
    if (selected.size === 0) {
      enqueueSnackbar("Chọn ít nhất một tư vấn viên.", { variant: "warning" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await postCounsellorAssign({
        templateId: Number(templateId),
        campusId: Number(campusId),
        counsellorIds: [...selected].filter((x) => Number.isFinite(Number(x))).map(Number),
        startDate,
        endDate,
        action: "ASSIGN",
      });
      const ok = res && res.status >= 200 && res.status < 300;
      if (ok) {
        enqueueSnackbar("Đã gán tư vấn viên vào khung giờ.", { variant: "success" });
        onSuccess?.();
        onClose();
      } else {
        throw new Error(res?.data?.message || "Gán không thành công.");
      }
    } catch (e) {
      const msg = e?.response?.data?.message ?? e?.message ?? "";
      const hints = parseBusyCounsellorHints(msg);
      const next = {};
      for (const c of list) {
        const cid = Number(c.id);
        if (Number.isFinite(cid) && selected.has(cid) && rowMatchesBusyHint(c, hints)) {
          next[cid] = msg || "Tư vấn viên bận lịch";
        }
      }
      if (Object.keys(next).length > 0) {
        setRowConflict(next);
        enqueueSnackbar("Một số tư vấn viên không thể gán. Xem dòng được đánh dấu.", { variant: "warning" });
      } else if (msg) {
        enqueueSnackbar(msg, { variant: "error" });
      } else {
        enqueueSnackbar("Gán không thành công.", { variant: "error" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => !submitting && onClose()}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: "16px" } }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pr: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Gán tư vấn viên
        </Typography>
        <IconButton onClick={() => !submitting && onClose()} size="small" aria-label="Đóng">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2.5 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems="stretch">
          <Box
            sx={{
              flex: "0 0 240px",
              p: 2,
              borderRadius: "12px",
              bgcolor: "#F8FAFC",
              border: "1px solid #E2E8F0",
            }}
          >
            <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600, textTransform: "uppercase" }}>
              Khung giờ (chỉ đọc)
            </Typography>
            <Typography sx={{ fontWeight: 700, mt: 1, color: "#0F172A" }}>{dayOfWeek}</Typography>
            <Typography sx={{ fontWeight: 600, mt: 0.5, color: "#334155" }}>
              {startTime} – {endTime}
            </Typography>
            <Typography variant="body2" sx={{ color: "#64748B", mt: 0.5 }}>
              {sessionTypeLabelText}
            </Typography>
          </Box>

          <Stack spacing={2.5} sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#374151" }}>
              Khoảng thời gian gán
            </Typography>
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
                InputLabelProps={{ shrink: true }}
                error={!!rangeError}
              />
            </Stack>
            {rangeError ? (
              <Typography variant="caption" color="error">
                {rangeError}
              </Typography>
            ) : null}

            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#374151" }}>
              Chọn tư vấn viên
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
