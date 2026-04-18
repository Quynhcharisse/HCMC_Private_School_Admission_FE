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
      color={differs ? "warning" : "default"}
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

/** Tư vấn viên gán cùng khung — max 0 = không trần trên. */
function fmtTvAssignRange(minV, maxV) {
  const mn = numOpScalar(minV);
  const mx = numOpScalar(maxV);
  const maxPart = mx > 0 ? ` · tối đa gán cùng khung ${mx}` : " · không giới hạn trần tư vấn viên gán (0)";
  return `Tư vấn viên: tối thiểu ${mn}${maxPart}`;
}

/**
 * So sánh quy định từ trụ sở chính với giá trị đang áp dụng tại cơ sở này (sau khi ghép dữ liệu).
 */
export function HqVsCampusSlotBufferSummary({effectiveOp, hqOp, hqMissing}) {
  const effSlot = effectiveOp?.slotDurationInMinutes;
  const effBuf = effectiveOp?.bufferBetweenSlotsMinutes;
  const hqLine =
    !hqMissing && hqOp && typeof hqOp === "object"
      ? fmtSlotBufferLine(hqOp.slotDurationInMinutes, hqOp.bufferBetweenSlotsMinutes)
      : null;
  const hqCycle =
    !hqMissing && hqOp && typeof hqOp === "object"
      ? cycleStepLine(hqOp.slotDurationInMinutes, hqOp.bufferBetweenSlotsMinutes)
      : null;
  const effCycle = cycleStepLine(effSlot, effBuf);
  const hqTv =
    !hqMissing && hqOp && typeof hqOp === "object"
      ? fmtTvAssignRange(hqOp.minCounsellorPerSlot, hqOp.maxCounsellorsPerSlot)
      : null;
  const effTv = fmtTvAssignRange(effectiveOp?.minCounsellorPerSlot, effectiveOp?.maxCounsellorsPerSlot);

  return (
    <Stack spacing={0.75} sx={{width: "100%", mb: 0.5}}>
      {hqLine != null ? (
        <Typography variant="caption" sx={{color: "#64748b", lineHeight: 1.5}}>
          <strong>Quy định từ trụ sở chính:</strong> {hqLine}
          {hqCycle ? ` · ${hqCycle}` : ""}
        </Typography>
      ) : null}
      {hqTv != null ? (
        <Typography variant="caption" sx={{color: "#64748b", lineHeight: 1.5, display: "block"}}>
          <strong>Tư vấn viên (theo trụ sở chính):</strong> {hqTv}
        </Typography>
      ) : null}
      <Typography variant="body2" sx={{color: "#334155", lineHeight: 1.55}}>
        <strong>Đang áp dụng tại cơ sở này:</strong> {fmtSlotBufferLine(effSlot, effBuf)}
        {effCycle ? ` · ${effCycle}` : ""}
      </Typography>
      <Typography variant="body2" sx={{color: "#334155", lineHeight: 1.55}}>
        <strong>Tư vấn viên (tại cơ sở này):</strong> {effTv}
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
