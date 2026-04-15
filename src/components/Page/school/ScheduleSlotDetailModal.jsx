import React, { useMemo } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";

const PRIMARY = "#0D64DE";
const BORDER_SOFT = "rgba(148, 163, 184, 0.22)";

function counsellorDisplayLabel(c) {
  const n = c?.name != null && String(c.name).trim() !== "" ? String(c.name).trim() : "";
  if (n) return n;
  return c?.email ? String(c.email) : `ID ${c?.id ?? "—"}`;
}

function counsellorInitials(c) {
  const label = counsellorDisplayLabel(c);
  const parts = label.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return label.slice(0, 2).toUpperCase() || "?";
}

function formatYmdToVi(ymd) {
  if (!ymd || typeof ymd !== "string") return "—";
  const p = ymd.split("-").map((x) => parseInt(x, 10));
  if (p.length < 3 || p.some((n) => Number.isNaN(n))) return ymd;
  return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString("vi-VN");
}

function sessionBadgeColors(sessionType) {
  const v = String(sessionType || "").toUpperCase();
  if (v === "MORNING") return { bg: "#FFFBEB", color: "#B45309", border: "rgba(245, 158, 11, 0.4)" };
  if (v === "AFTERNOON") return { bg: "#EFF6FF", color: "#1D4ED8", border: "rgba(59, 130, 246, 0.35)" };
  if (v === "EVENING") return { bg: "#F5F3FF", color: "#6D28D9", border: "rgba(139, 92, 246, 0.35)" };
  return { bg: "#F8FAFC", color: "#475569", border: BORDER_SOFT };
}

/**
 * Modal chi tiết khung giờ + danh sách tư vấn viên (School admin).
 */
export default function ScheduleSlotDetailModal({
  open,
  onClose,
  slot,
  dayLabel,
  sessionLabel,
  campusName,
  assigns,
  slotActive = true,
  onAssign,
  onEdit,
  onDeleteSchedule,
  onRemoveCounsellor,
}) {
  const sortedAssigns = useMemo(() => {
    if (!Array.isArray(assigns)) return [];
    return [...assigns].sort((a, b) =>
      counsellorDisplayLabel(a?.counsellor).localeCompare(counsellorDisplayLabel(b?.counsellor), "vi")
    );
  }, [assigns]);

  const badge = sessionBadgeColors(slot?.sessionType);

  return (
    <Dialog
      open={open}
      onClose={(event, reason) => {
        if (reason === "backdropClick") return;
        onClose();
      }}
      maxWidth="md"
      fullWidth
      scroll="paper"
      PaperProps={{
        sx: {
          borderRadius: "12px",
          boxShadow: "0 8px 30px rgba(15, 23, 42, 0.12)",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pr: 1,
          pb: 1.5,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
          Chi tiết khung giờ
        </Typography>
        <IconButton onClick={onClose} size="small" aria-label="Đóng">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2.5, pb: 1 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2.5} alignItems="stretch">
          <Box
            sx={{
              flex: { xs: "1 1 auto", md: "0 0 280px" },
              p: 2,
              borderRadius: "12px",
              bgcolor: "#F8FAFC",
              border: `1px solid ${BORDER_SOFT}`,
            }}
          >
            <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, letterSpacing: "0.06em" }}>
              Thông tin lịch
            </Typography>
            <Stack spacing={1.25} sx={{ mt: 1.5 }}>
              <Box>
                <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 600 }}>
                  Ngày trong tuần
                </Typography>
                <Typography sx={{ fontWeight: 700, color: "#0F172A", mt: 0.25 }}>{dayLabel || "—"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 600 }}>
                  Khung giờ
                </Typography>
                <Typography sx={{ fontWeight: 700, color: "#0F172A", mt: 0.25, fontVariantNumeric: "tabular-nums" }}>
                  {slot?.startTime ?? "—"} – {slot?.endTime ?? "—"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 600 }}>
                  Loại buổi
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    size="small"
                    label={sessionLabel || "—"}
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      bgcolor: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`,
                    }}
                  />
                </Box>
              </Box>
              {campusName ? (
                <Box>
                  <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 600 }}>
                    Cơ sở
                  </Typography>
                  <Typography sx={{ fontWeight: 600, color: "#334155", mt: 0.25 }}>{campusName}</Typography>
                </Box>
              ) : null}
              {!slotActive ? (
                <Chip
                  label="Ngưng"
                  size="small"
                  sx={{
                    alignSelf: "flex-start",
                    height: 24,
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    bgcolor: "rgba(100,116,139,0.12)",
                    color: "#475569",
                  }}
                />
              ) : null}
            </Stack>
          </Box>

          <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0F172A", mb: 1.5 }}>
              Tư vấn viên được gán
            </Typography>

            {sortedAssigns.length === 0 ? (
              <Box
                sx={{
                  flex: 1,
                  minHeight: 160,
                  borderRadius: "12px",
                  border: `1px dashed ${BORDER_SOFT}`,
                  bgcolor: "rgba(248, 250, 252, 0.9)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  px: 2,
                  py: 3,
                  gap: 1.5,
                }}
              >
                <Typography variant="body2" sx={{ color: "#64748B", textAlign: "center", fontWeight: 500 }}>
                  Chưa có tư vấn viên được gán
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<PersonAddAlt1Icon />}
                  disabled={!slotActive}
                  onClick={onAssign}
                  sx={{
                    textTransform: "none",
                    fontWeight: 700,
                    borderRadius: "10px",
                    bgcolor: PRIMARY,
                    "&:hover": { bgcolor: "#0a52bd" },
                  }}
                >
                  Gán ngay
                </Button>
              </Box>
            ) : (
              <>
                <Stack
                  spacing={0}
                  sx={{
                    maxHeight: 280,
                    overflow: "auto",
                    borderRadius: "12px",
                    border: `1px solid ${BORDER_SOFT}`,
                    bgcolor: "#fff",
                  }}
                >
                  {sortedAssigns.map((row) => {
                    const c = row?.counsellor;
                    const name = counsellorDisplayLabel(c);
                    const email = c?.email != null && String(c.email).trim() !== "" ? String(c.email).trim() : "";
                    const rangeText = `${formatYmdToVi(row.startDate)} → ${formatYmdToVi(row.endDate)}`;
                    const tip = [name, email, rangeText].filter(Boolean).join(" · ");
                    return (
                      <Tooltip key={row.slotId ?? `${c?.id}-${row.startDate}-${row.endDate}`} title={tip} arrow>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.25,
                            px: 1.5,
                            py: 1.25,
                            borderBottom: `1px solid ${BORDER_SOFT}`,
                            transition: "background-color 0.15s ease",
                            "&:last-of-type": { borderBottom: "none" },
                            "&:hover": { bgcolor: "rgba(248, 250, 252, 0.95)" },
                          }}
                        >
                          <Avatar
                            sx={{
                              width: 40,
                              height: 40,
                              fontSize: "0.8rem",
                              bgcolor: PRIMARY,
                              color: "#fff",
                            }}
                          >
                            {counsellorInitials(c)}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: "0.875rem", color: "#0F172A" }} noWrap>
                              {name}
                            </Typography>
                            {email ? (
                              <Typography variant="caption" sx={{ color: "#64748B", display: "block" }} noWrap>
                                {email}
                              </Typography>
                            ) : null}
                            <Typography variant="caption" sx={{ color: "#94A3B8", display: "block", mt: 0.25 }}>
                              {rangeText}
                            </Typography>
                          </Box>
                          <Button
                            size="small"
                            color="error"
                            variant="text"
                            disabled={!slotActive}
                            onClick={() => onRemoveCounsellor?.(row)}
                            sx={{ flexShrink: 0, textTransform: "none", fontWeight: 700, minWidth: 72 }}
                          >
                            Gỡ
                          </Button>
                        </Box>
                      </Tooltip>
                    );
                  })}
                </Stack>
                <Button
                  variant="outlined"
                  startIcon={<PersonAddAlt1Icon />}
                  disabled={!slotActive}
                  onClick={onAssign}
                  fullWidth
                  sx={{
                    mt: 1.5,
                    textTransform: "none",
                    fontWeight: 700,
                    borderRadius: "10px",
                    borderColor: "rgba(13, 100, 222, 0.35)",
                    color: PRIMARY,
                    py: 1,
                    "&:hover": { borderColor: PRIMARY, bgcolor: "rgba(13, 100, 222, 0.06)" },
                  }}
                >
                  Gán thêm tư vấn viên
                </Button>
              </>
            )}
          </Box>
        </Stack>
      </DialogContent>
      <Divider />
      <DialogActions
        sx={{
          px: 2.5,
          py: 2,
          flexWrap: "wrap",
          gap: 1,
          justifyContent: "space-between",
          bgcolor: "#FAFAFA",
          borderTop: `1px solid ${BORDER_SOFT}`,
        }}
      >
        <Button
          color="error"
          variant="outlined"
          startIcon={<DeleteOutlineIcon />}
          onClick={onDeleteSchedule}
          disabled={!slotActive}
          sx={{ textTransform: "none", fontWeight: 700, borderRadius: "10px" }}
        >
          Vô hiệu hóa khung giờ
        </Button>
        <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="flex-end">
          <Button
            variant="contained"
            startIcon={<EditOutlinedIcon />}
            onClick={onEdit}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              borderRadius: "10px",
              bgcolor: PRIMARY,
              "&:hover": { bgcolor: "#0a52bd" },
            }}
          >
            Sửa lịch
          </Button>
          <Button onClick={onClose} sx={{ textTransform: "none", fontWeight: 600, color: "#64748B" }}>
            Đóng
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
