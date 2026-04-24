import React from "react";
import {Chip, Stack, Typography} from "@mui/material";

import {computeOpScalarVsHq, numOpScalar} from "../../../utils/campusOperationHqCompare.js";

/**
 * So sánh giá trị form với cấu hình do trụ sở chính thiết lập (API: hqDefault.operation).
 * @param {{ fieldKey: string, effectiveOp: object, hqOp: object, hqMissing: boolean }} props
 */
export function HqScalarDiffChip({fieldKey, effectiveOp, hqOp, hqMissing}) {
  const map = computeOpScalarVsHq(effectiveOp, hqOp, hqMissing);
  const differs = map[fieldKey];
  if (differs === null) return null;
  return (
    <Chip
      size="small"
      label={differs ? "Khác với trụ sở chính" : "Giống trụ sở chính"}
      color={differs ? "primary" : "default"}
      variant={differs ? "filled" : "outlined"}
      sx={{height: 22, fontSize: "0.7rem", flexShrink: 0}}
    />
  );
}

function fmtSlotBufferLine(slot, buf) {
  const s = numOpScalar(slot);
  const b = numOpScalar(buf);
  if (!(s > 0)) return "—";
  return b > 0 ? `Tiết ${s} phút + nghỉ ${b} phút` : `Tiết ${s} phút · không nghỉ giữa tiết`;
}

function cycleStepLine(slot, buf) {
  const s = numOpScalar(slot);
  if (!(s > 0)) return null;
  return `Khoảng cách giữa hai đầu tiết (tiết + nghỉ): ${s + numOpScalar(buf)} phút`;
}

/** Nội dung ngắn (không lặp tiêu đề "Tư vấn viên:") — max 0 = không trần. */
function fmtTvAssignBody(minV, maxV) {
  const mn = numOpScalar(minV);
  const mx = numOpScalar(maxV);
  const maxPart = mx > 0 ? ` · tối đa gán cùng khung ${mx}` : " · không giới hạn trần gán (0)";
  return `tối thiểu ${mn}${maxPart}`;
}

/**
 * So sánh quy định từ trụ sở chính với giá trị đang áp dụng tại cơ sở này (sau khi ghép dữ liệu).
 */
export function HqVsCampusSlotBufferSummary({effectiveOp, hqOp, hqMissing}) {
  const effSlot = effectiveOp?.slotDurationInMinutes;
  const effBuf = effectiveOp?.bufferBetweenSlotsMinutes;
  const effCycle = cycleStepLine(effSlot, effBuf);
  const effLineFull = `${fmtSlotBufferLine(effSlot, effBuf)}${effCycle ? ` · ${effCycle}` : ""}`;
  const effTvBody = fmtTvAssignBody(effectiveOp?.minCounsellorPerSlot, effectiveOp?.maxCounsellorsPerSlot);

  const hasHq = !hqMissing && hqOp && typeof hqOp === "object";
  const hqCycle = hasHq ? cycleStepLine(hqOp.slotDurationInMinutes, hqOp.bufferBetweenSlotsMinutes) : null;
  const hqLineFull = hasHq
    ? `${fmtSlotBufferLine(hqOp.slotDurationInMinutes, hqOp.bufferBetweenSlotsMinutes)}${hqCycle ? ` · ${hqCycle}` : ""}`
    : "";
  const hqTvBody = hasHq ? fmtTvAssignBody(hqOp.minCounsellorPerSlot, hqOp.maxCounsellorsPerSlot) : "";

  const sameSlot =
    hasHq &&
    numOpScalar(hqOp.slotDurationInMinutes) === numOpScalar(effSlot) &&
    numOpScalar(hqOp.bufferBetweenSlotsMinutes) === numOpScalar(effBuf);
  const sameTv =
    hasHq &&
    numOpScalar(hqOp.minCounsellorPerSlot) === numOpScalar(effectiveOp?.minCounsellorPerSlot) &&
    numOpScalar(hqOp.maxCounsellorsPerSlot) === numOpScalar(effectiveOp?.maxCounsellorsPerSlot);

  if (!hasHq) {
    return (
      <Stack spacing={0.75} sx={{width: "100%", mb: 0.5}}>
        <Typography variant="body2" sx={{color: "#334155", lineHeight: 1.55}}>
          <strong>Đang áp dụng tại cơ sở này — tiết và nghỉ:</strong> {effLineFull}
        </Typography>
        <Typography variant="body2" sx={{color: "#334155", lineHeight: 1.55}}>
          <strong>Gán tư vấn viên:</strong> {effTvBody}
        </Typography>
      </Stack>
    );
  }

  if (sameSlot && sameTv) {
    return (
      <Stack spacing={0.75} sx={{width: "100%", mb: 0.5}}>
        <Typography variant="body2" sx={{color: "#334155", lineHeight: 1.55}}>
          <strong>Đồng bộ với trụ sở chính.</strong> Tiết, nghỉ và quy định gán tư vấn viên đang khớp với trụ sở.
        </Typography>
        <Typography variant="caption" sx={{color: "#64748b", lineHeight: 1.5}}>
          {effLineFull} · {effTvBody}
        </Typography>
      </Stack>
    );
  }

  if (sameSlot && !sameTv) {
    return (
      <Stack spacing={0.75} sx={{width: "100%", mb: 0.5}}>
        <Typography variant="caption" sx={{color: "#64748b", lineHeight: 1.5}}>
          Tiết/nghỉ <strong>giống trụ sở chính</strong>: {effLineFull}
        </Typography>
        <Typography variant="caption" sx={{color: "#64748b", lineHeight: 1.5}}>
          <strong>Trụ sở — gán tư vấn viên:</strong> {hqTvBody}
        </Typography>
        <Typography variant="body2" sx={{color: "#334155", lineHeight: 1.55}}>
          <strong>Tại cơ sở — gán tư vấn viên:</strong> {effTvBody}
        </Typography>
      </Stack>
    );
  }

  if (!sameSlot && sameTv) {
    return (
      <Stack spacing={0.75} sx={{width: "100%", mb: 0.5}}>
        <Typography variant="caption" sx={{color: "#64748b", lineHeight: 1.5}}>
          <strong>Trụ sở — tiết/nghỉ:</strong> {hqLineFull}
        </Typography>
        <Typography variant="body2" sx={{color: "#334155", lineHeight: 1.55}}>
          <strong>Tại cơ sở — tiết/nghỉ:</strong> {effLineFull}
        </Typography>
        <Typography variant="caption" sx={{color: "#64748b", lineHeight: 1.5}}>
          Gán tư vấn viên <strong>giống trụ sở</strong>: {effTvBody}
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={0.75} sx={{width: "100%", mb: 0.5}}>
      <Typography variant="caption" sx={{color: "#64748b", lineHeight: 1.5}}>
        <strong>Trụ sở chính:</strong> {hqLineFull} · {hqTvBody}
      </Typography>
      <Typography variant="body2" sx={{color: "#334155", lineHeight: 1.55}}>
        <strong>Tại cơ sở này (đang áp dụng):</strong> {effLineFull} · {effTvBody}
      </Typography>
    </Stack>
  );
}

/** Gợi ý chu kỳ tiết + nghỉ trên màn cấu hình cấp trường (không so sánh cơ sở). */
export function SchoolSlotCycleHint({slotMinutes, bufferMinutes}) {
  const s = numOpScalar(slotMinutes);
  if (!(s > 0)) return null;
  const line = cycleStepLine(slotMinutes, bufferMinutes);
  if (!line) return null;
  return (
    <Typography variant="caption" sx={{color: "#64748b", display: "block", width: "100%", mt: -0.5}}>
      {line}
    </Typography>
  );
}
