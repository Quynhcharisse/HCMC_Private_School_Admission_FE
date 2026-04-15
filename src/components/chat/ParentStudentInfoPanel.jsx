import React, { useState } from "react";
import {
  Box,
  Collapse,
  Divider,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { GRADE_LEVELS } from "../Page/childrenInfo/childrenInfoHelpers.js";

const subjectLabelFromRow = (r) => {
  const n = r?.subjectName ?? r?.name ?? r?.subject;
  if (n == null || String(n).trim() === "") return null;
  return String(n).trim();
};

const formatGender = (value) => {
  const upper = String(value ?? "").trim().toUpperCase();
  if (upper === "MALE") return "Nam";
  if (upper === "FEMALE") return "Nữ";
  if (upper === "OTHER") return "Khác";
  return "";
};

export const getStudentCompactInfo = (student) => {
  const raw = student?.raw || {};
  const items = [];
  const addItem = (label, value) => {
    if (!value) return;
    items.push({ label, value: String(value) });
  };

  addItem("Họ tên", student?.name);
  addItem("Giới tính", formatGender(raw?.gender));
  addItem("Nhóm tính cách", raw?.personalityTypeCode ?? raw?.personalityType?.code);
  addItem("Ngành yêu thích", raw?.favouriteJob ?? raw?.favoriteJob);

  return items;
};

const pickFirstNonEmpty = (...values) => {
  for (const value of values) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
};

const MBTI_FALLBACK_INSIGHTS = {
  INTP: {
    highlightedTraits:
      "Tư duy logic, thích phân tích sâu, độc lập trong cách học và giải quyết vấn đề.",
    strengths:
      "Giỏi lập luận, sáng tạo trong ý tưởng, học nhanh khi gặp chủ đề đúng sở thích.",
    weaknesses:
      "Dễ mất hứng với việc lặp lại, có thể ít bộc lộ cảm xúc và chậm ra quyết định thực tế.",
  },
};

export const extractPersonalityInsights = (raw) => {
  if (!raw || typeof raw !== "object")
    return {
      traitItems: [],
      highlightedTraits: "",
      strengths: "",
      weaknesses: "",
    };
  const personality = raw?.personalityType ?? {};
  const personalityCode = pickFirstNonEmpty(raw?.personalityTypeCode, personality?.code).toUpperCase();
  const fallback = MBTI_FALLBACK_INSIGHTS[personalityCode] || null;
  const traits = Array.isArray(raw?.traits) ? raw.traits : [];
  const traitItems = traits
    .map((t) => ({
      name: pickFirstNonEmpty(t?.name),
      description: pickFirstNonEmpty(t?.description),
    }))
    .filter((t) => t.name || t.description);
  const traitNamesText = traits
    .map((t) => pickFirstNonEmpty(t?.name))
    .filter(Boolean)
    .join(", ");
  const traitDescriptionsText = traits
    .map((t) => pickFirstNonEmpty(t?.description))
    .filter(Boolean)
    .join(" ");
  const highlightedTraits = pickFirstNonEmpty(
    traitDescriptionsText,
    traitNamesText,
    personality?.highlightedTraits,
    personality?.keyTraits,
    personality?.traits,
    raw?.personalityHighlights,
    raw?.personalityTraitHighlights,
    raw?.personalityTraits,
    fallback?.highlightedTraits
  );
  const strengths = pickFirstNonEmpty(
    personality?.strengths,
    personality?.advantages,
    raw?.personalityStrengths,
    raw?.strengths,
    fallback?.strengths
  );
  const weaknesses = pickFirstNonEmpty(
    personality?.weaknesses,
    personality?.disadvantages,
    raw?.personalityWeaknesses,
    raw?.weaknesses,
    fallback?.weaknesses
  );
  return { traitItems, highlightedTraits, strengths, weaknesses };
};

const normalizeGradeLevelKey = (gl) => {
  if (gl == null) return "";
  const s = String(gl).toUpperCase().replace(/\s+/g, "_");
  const m = s.match(/GRADE_\d+/);
  return m ? m[0] : s;
};

export const buildAcademicScoreTable = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  const academicInfos =
    Array.isArray(raw.academicInfos) && raw.academicInfos.length > 0
      ? raw.academicInfos
      : Array.isArray(raw.academicProfileMetadata) && raw.academicProfileMetadata.length > 0
        ? raw.academicProfileMetadata
        : null;
  if (!academicInfos?.length) return null;

  const byGrade = new Map();
  for (const block of academicInfos) {
    const gl = block?.gradeLevel ?? block?.grade ?? block?.level;
    if (gl == null) continue;
    const key = normalizeGradeLevelKey(gl);
    if (!key) continue;
    const rows = block?.subjectResults ?? block?.subjectResultList ?? block?.results ?? [];
    byGrade.set(key, Array.isArray(rows) ? rows : []);
  }

  const subjectSet = new Set();
  for (const rows of byGrade.values()) {
    for (const r of rows) {
      const label = subjectLabelFromRow(r);
      if (label) subjectSet.add(label);
    }
  }
  const subjects = [...subjectSet].sort((a, b) => a.localeCompare(b, "vi"));

  const getScore = (subject, gradeEnum) => {
    const key = normalizeGradeLevelKey(gradeEnum);
    const rows = byGrade.get(key) || [];
    const found = rows.find((r) => subjectLabelFromRow(r) === subject);
    if (!found) return "—";
    const s = found?.score;
    if (s == null || s === "") return "—";
    return String(s);
  };

  if (subjects.length === 0) return null;
  return { subjects, getScore };
};

function ParentStudentInfoPanel({ studentName, compactInfo, gradeTable, personalityInsights }) {
  const hasAnyData = compactInfo.length > 0 || gradeTable;
  const [personalityExpanded, setPersonalityExpanded] = useState(false);

  return (
    <>
      <Box
        sx={{
          mb: 1,
          px: 1,
          py: 0.9,
          borderRadius: 1.5,
          background: "linear-gradient(135deg, rgba(59,130,246,0.12), rgba(99,102,241,0.08))",
          border: "1px solid rgba(99,102,241,0.2)",
        }}
      >
        <Typography sx={{ fontSize: 13, fontWeight: 900, color: "#0f172a", flexShrink: 0, letterSpacing: 0.1 }}>
          Thông tin {studentName}
        </Typography>
      </Box>
      {compactInfo.length > 0 && (
        <Box sx={{ display: "grid", gap: 0.65, mb: gradeTable ? 1.1 : 0, flexShrink: 0 }}>
          {compactInfo.map((item) => {
            const isPersonality = item.label === "Nhóm tính cách";
            const canToggle = isPersonality;
            return (
              <Box
                key={item.label}
                sx={{
                  px: 0.9,
                  py: 0.68,
                  borderRadius: 1.35,
                  bgcolor: "#ffffff",
                  border: "1px solid rgba(191,219,254,0.8)",
                  boxShadow: "0 6px 14px rgba(15,23,42,0.05)",
                  transition: "transform 0.18s ease, box-shadow 0.18s ease",
                  "&:hover": {
                    transform: "translateY(-1px)",
                    boxShadow: "0 10px 20px rgba(59,130,246,0.12)",
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 0.75,
                  }}
                >
                  <Typography sx={{ fontSize: 11.4, color: "#475569", fontWeight: 800 }}>{item.label}</Typography>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.2 }}>
                    <Typography sx={{ fontSize: 12.1, color: "#0f172a", fontWeight: 700 }}>{item.value}</Typography>
                    {canToggle ? (
                      <IconButton
                        size="small"
                        onClick={() => setPersonalityExpanded((prev) => !prev)}
                        sx={{
                          ml: 0.2,
                          p: 0.25,
                          color: "#64748b",
                          transition: "transform 0.18s ease",
                          transform: personalityExpanded ? "rotate(180deg)" : "rotate(0deg)",
                        }}
                      >
                        <ExpandMoreIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    ) : null}
                  </Box>
                </Box>
                {canToggle ? (
                  <Collapse in={personalityExpanded} timeout={200} unmountOnExit>
                    <Box
                      sx={{
                        mt: 0.72,
                        pt: 0.72,
                        borderTop: "1px dashed rgba(148,163,184,0.45)",
                        display: "grid",
                        gap: 0.58,
                      }}
                    >
                      {Array.isArray(personalityInsights?.traitItems) && personalityInsights.traitItems.length > 0 ? (
                        <Box sx={{ display: "grid", gap: 0.6 }}>
                          {personalityInsights.traitItems.map((trait, idx) => (
                            <Box
                              key={`${trait.name || "trait"}-${idx}`}
                              sx={{
                                px: 0.72,
                                py: 0.58,
                                borderRadius: 1.1,
                                bgcolor: "rgba(239,246,255,0.85)",
                                border: "1px solid rgba(191,219,254,0.85)",
                              }}
                            >
                              <Typography sx={{ fontSize: 11.2, color: "#1d4ed8", fontWeight: 800, mb: 0.2 }}>
                                {trait.name || `Đặc điểm ${idx + 1}`}
                              </Typography>
                              <Typography sx={{ fontSize: 11.1, color: "#334155", lineHeight: 1.45 }}>
                                {trait.description || "Chưa có mô tả"}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      ) : null}
                      {Array.isArray(personalityInsights?.traitItems) && personalityInsights.traitItems.length > 0 ? null : (
                        <Typography sx={{ fontSize: 11.25, color: "#334155", lineHeight: 1.45 }}>
                          <Box component="span" sx={{ fontWeight: 700 }}>
                            Đặc điểm nổi bật:{" "}
                          </Box>
                          {personalityInsights?.highlightedTraits || "Chưa có dữ liệu"}
                        </Typography>
                      )}
                      <Typography sx={{ fontSize: 11.25, color: "#334155", lineHeight: 1.45 }}>
                        <Box component="span" sx={{ fontWeight: 700 }}>
                          Ưu điểm:{" "}
                        </Box>
                        {personalityInsights?.strengths || "Chưa có dữ liệu"}
                      </Typography>
                      <Typography sx={{ fontSize: 11.25, color: "#334155", lineHeight: 1.45 }}>
                        <Box component="span" sx={{ fontWeight: 700 }}>
                          Nhược điểm:{" "}
                        </Box>
                        {personalityInsights?.weaknesses || "Chưa có dữ liệu"}
                      </Typography>
                    </Box>
                  </Collapse>
                ) : null}
              </Box>
            );
          })}
        </Box>
      )}
      <Divider sx={{ my: 1.05, flexShrink: 0 }} />
      <Typography sx={{ fontSize: 12, fontWeight: 900, color: "#334155", mb: 0.8, flexShrink: 0 }}>
        Bảng điểm (cả năm)
      </Typography>
      {gradeTable ? (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            flex: "0 0 auto",
            minHeight: "unset",
            maxHeight: "none",
            overflow: "visible",
            border: "1px solid rgba(191,219,254,0.95)",
            borderRadius: 1.45,
            bgcolor: "rgba(255,255,255,0.99)",
            boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
          }}
        >
          <Table size="small" stickyHeader sx={{ minWidth: 360 }}>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    fontWeight: 800,
                    fontSize: 11,
                    bgcolor: "rgba(219,234,254,0.7)",
                    minWidth: 120,
                    position: "sticky",
                    left: 0,
                    zIndex: 2,
                    borderBottom: "1px solid rgba(226,232,240,0.95)",
                  }}
                >
                  Môn
                </TableCell>
                {GRADE_LEVELS.map((g) => (
                  <TableCell
                    key={g.key}
                    align="center"
                    sx={{
                      fontWeight: 800,
                      fontSize: 10.5,
                      whiteSpace: "nowrap",
                      bgcolor: "rgba(219,234,254,0.7)",
                      px: 0.65,
                      borderBottom: "1px solid rgba(226,232,240,0.95)",
                    }}
                  >
                    {g.label.replace("Lớp ", "")}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {gradeTable.subjects.map((subject) => (
                <TableRow key={subject} hover>
                  <TableCell
                    sx={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      position: "sticky",
                      left: 0,
                      bgcolor: "rgba(255,255,255,0.99)",
                      borderBottom: "1px solid rgba(241,245,249,0.95)",
                      maxWidth: 140,
                    }}
                  >
                    {subject}
                  </TableCell>
                  {GRADE_LEVELS.map((g) => (
                    <TableCell
                      key={`${subject}-${g.key}`}
                      align="center"
                      sx={{
                        fontSize: 11.5,
                        borderBottom: "1px solid rgba(226,232,240,0.95)",
                        px: 0.5,
                      }}
                    >
                      {gradeTable.getScore(subject, g.gradeLevelEnum)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Typography sx={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.55 }}>
          Chưa có dữ liệu học bạ để hiển thị.
        </Typography>
      )}
      {!hasAnyData && (
        <Typography sx={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.55, mt: 0.5 }}>
          Chưa có dữ liệu chi tiết cho học sinh này.
        </Typography>
      )}
    </>
  );
}

export default ParentStudentInfoPanel;
