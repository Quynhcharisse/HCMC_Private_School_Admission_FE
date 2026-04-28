import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import {useNavigate, useSearchParams} from "react-router-dom";
import {closeSnackbar, enqueueSnackbar} from "notistack";

import {extractCampusListBody, listCampuses} from "../../../services/CampusService.jsx";
import {useSchool} from "../../../contexts/SchoolContext.jsx";
import {
  confirmMandatoryDocImportRows,
  getCampusConfig,
  getSchoolConfig,
  parseSchoolConfigResponseBody,
  previewMandatoryDocsImport,
  updateCampusConfig,
  updateSchoolConfig,
  validateMandatoryDocImportRow,
} from "../../../services/SchoolFacilityService.jsx";
import {fetchSystemAdmissionSettingsData, getSystemConfigByKey} from "../../../services/SystemConfigService.jsx";
import {getCurrentSchoolSubscription} from "../../../services/SchoolSubscriptionService.jsx";
import {admissionSettingsComparableJson, sanitizeAdmissionSettingsForApi} from "../../../utils/admissionSettingsShared.js";
import {SchoolFacilityFacilityForm} from "./SchoolFacilityConfiguration.jsx";
import SchoolWideScheduleReadOnlyPanel from "./SchoolWideScheduleReadOnlyPanel.jsx";
import {HqScalarDiffChip, HqVsCampusSlotBufferSummary, SchoolSlotCycleHint} from "./CampusOperationHqHints.jsx";
import {resolveSchoolWideWorkingConfigDisplay} from "../../../utils/schoolWideWorkingConfig.js";
import {
  emptyAcademicCalendar,
  isAcademicCalendarLimitActive,
  termIsComplete,
  validateAcademicCalendarForSave,
} from "../../../utils/academicCalendarUi.js";
import {
  canonicalizeWorkShiftName,
  normalizeTimeHHmm,
  normalizeWorkShiftForApi,
  validateOperationSettingsWorkShifts,
  WORK_SHIFT_TIME_WINDOWS,
  WORK_SHIFT_TYPE_CODES,
  WORK_SHIFT_TYPE_LABEL_VI,
} from "../../../utils/workShiftPolicy.js";

const TAB_SLUGS = ["admission", "documents", "operation", "finance", "facility", "quota", "resource-distribution"];
const TAB_LABELS = [
  "Cài đặt tuyển sinh",
  "Cài đặt hồ sơ",
  "Cài đặt vận hành",
  "Cài đặt tài chính",
  "Cài đặt cơ sở vật chất",
  "Cài đặt chỉ tiêu",
  "Phân bổ nguồn lực",
];

/** Campus phụ: chỉ vận hành + cơ sở vật chất (API GET/PUT /campus/{id}/config) */
const BRANCH_TAB_SLUGS = ["operation", "facility"];
const BRANCH_TAB_LABELS = ["Cài đặt vận hành", "Cài đặt cơ sở vật chất"];

/**
 * Danh sách phương thức hiển thị checkbox: từ API, không preset FE.
 * - `availableMethods` / `available_methods`: đủ lựa chọn (bật/tắt theo `allowedMethods`).
 * - Chỉ có `allowedMethods`: mỗi dòng tương ứng một phương thức đang cấu hình (có thể thêm bằng nút Thêm).
 */
function mergeAdmissionMethodCatalogRows(availableMethods, allowedMethods) {
  const map = new Map();
  for (const m of availableMethods || []) {
    const code = m?.code != null ? String(m.code).trim() : "";
    if (!code) continue;
    map.set(code, {...(m && typeof m === "object" ? m : {}), code});
  }
  for (const m of allowedMethods || []) {
    if (m && typeof m === "object" && m.__isNewRow) continue;
    const code = m?.code != null ? String(m.code).trim() : "";
    if (!code) continue;
    const prev = map.get(code) || {};
    map.set(code, {...prev, ...m, code});
  }
  return Array.from(map.values());
}

/** Phương thức đang được trỏ bởi hồ sơ theo phương thức hoặc quy trình — cảnh báo khi bỏ bật / xóa dòng. */
function isMethodCodeReferencedInOtherConfig(code, cfg) {
  const c = String(code ?? "").trim();
  if (!c || !cfg || typeof cfg !== "object") return false;
  const doc = (cfg.documentRequirementsData?.byMethod || []).some((g) => String(g?.methodCode ?? "").trim() === c);
  const proc = (cfg.admissionSettingsData?.methodAdmissionProcess || []).some(
    (g) => String(g?.methodCode ?? "").trim() === c
  );
  return doc || proc;
}

const DAY_CODES = [
  {code: "MON", label: "T2"},
  {code: "TUE", label: "T3"},
  {code: "WED", label: "T4"},
  {code: "THU", label: "T5"},
  {code: "FRI", label: "T6"},
  {code: "SAT", label: "T7"},
  {code: "SUN", label: "CN"},
];

/** Luân phiên theo chỉ số nhóm — tab Vận hành (quy trình theo phương thức) & tab Tài chính (các khoản phí). */
const METHOD_PROCESS_VISUAL_ACCENTS = [
  {bar: "#2563eb", border: "rgba(37, 99, 235, 0.42)", headerBg: "linear-gradient(100deg, rgba(37,99,235,0.16) 0%, rgba(37,99,235,0.05) 50%, rgba(255,255,255,0) 100%)", stepsBg: "rgba(37, 99, 235, 0.06)", stepsBorder: "rgba(37, 99, 235, 0.22)"},
  {bar: "#7c3aed", border: "rgba(124, 58, 237, 0.4)", headerBg: "linear-gradient(100deg, rgba(124,58,237,0.16) 0%, rgba(124,58,237,0.05) 50%, rgba(255,255,255,0) 100%)", stepsBg: "rgba(124, 58, 237, 0.07)", stepsBorder: "rgba(124, 58, 237, 0.22)"},
  {bar: "#0d9488", border: "rgba(13, 148, 136, 0.42)", headerBg: "linear-gradient(100deg, rgba(13,148,136,0.15) 0%, rgba(13,148,136,0.05) 50%, rgba(255,255,255,0) 100%)", stepsBg: "rgba(13, 148, 136, 0.07)", stepsBorder: "rgba(13, 148, 136, 0.22)"},
  {bar: "#c2410c", border: "rgba(194, 65, 12, 0.4)", headerBg: "linear-gradient(100deg, rgba(194,65,12,0.14) 0%, rgba(194,65,12,0.05) 50%, rgba(255,255,255,0) 100%)", stepsBg: "rgba(194, 65, 12, 0.06)", stepsBorder: "rgba(194, 65, 12, 0.22)"},
];

/** Khớp enum BE `ResourceType`: value JSON `counsellor` (COUNSELLOR). */
const RESOURCE_TYPE_OPTIONS = [{value: "counsellor", label: "Tư vấn viên"}];

const RESOURCE_TYPE_VALUE_SET = new Set(RESOURCE_TYPE_OPTIONS.map((o) => o.value));

function canonicalResourceType(raw) {
  if (raw == null) return "";
  const s = String(raw).trim();
  if (!s) return "";
  const lower = s.toLowerCase();
  if (lower === "counsellor" || lower === "counselor") return "counsellor";
  return s;
}

function isKnownResourceTypeValue(v) {
  return v != null && RESOURCE_TYPE_VALUE_SET.has(String(v));
}

/** Snackbar sau lưu Cấu hình chung (PUT school config) — đồng bộ với thông điệp BE tiếng Anh. */
function schoolConfigSaveSuccessMessage(apiMessage) {
  const raw = apiMessage != null ? String(apiMessage).trim() : "";
  if (!raw) return "Chỉnh sửa thành công";
  const lower = raw.toLowerCase().replace(/\.$/, "");
  if (lower === "update successfully") return "Chỉnh sửa thành công";
  return raw;
}

/** Snackbar sau lưu Cấu hình theo cơ sở (PUT /campus/{id}/config). */
function campusConfigSaveSuccessMessage(apiMessage) {
  const raw = apiMessage != null ? String(apiMessage).trim() : "";
  if (!raw) return "Chỉnh sửa cấu hình cơ sở thành công";
  const lower = raw.toLowerCase().replace(/\.$/, "");
  if (lower === "campus config updated successfully") return "Chỉnh sửa cấu hình cơ sở thành công";
  return raw;
}

function defaultConfig() {
  return {
    admissionSettingsData: {
      availableMethods: [],
      allowedMethods: [],
      methodAdmissionProcess: [],
      autoCloseOnFull: true,
      quotaAlertThresholdPercent: 90,
    },
    quotaConfigData: {
      academicYear: "",
      totalSystemQuota: 0,
      campusAssignments: [],
    },
    financePolicyData: {
      paymentNotes: "",
      feeItems: [],
      reservationFee: {amount: 0, display: "", currency: "VND"},
      priceAdjustment: {minPercent: 0, maxPercent: 0},
    },
    documentRequirementsData: {
      mandatoryAll: [],
      byMethod: [],
    },
    operationSettingsData: {
      hotline: "",
      emailSupport: "",
      maxBookingPerSlot: 1,
      minCounsellorPerSlot: 1,
      maxCounsellorsPerSlot: 0,
      slotDurationInMinutes: 30,
      bufferBetweenSlotsMinutes: 0,
      allowBookingBeforeHours: 24,
      workingConfig: {
        note: "",
        workShifts: [],
        regularDays: ["MON", "TUE", "WED", "THU", "FRI"],
        weekendDays: ["SAT"],
        isOpenSunday: false,
      },
      academicCalendar: {
        term1: {start: "", end: ""},
        term2: {start: "", end: ""},
      },
      /** Mùa / chiến dịch tuyển sinh (ca tăng cường, nhân sự…) — PUT `admissionSeasons` */
      admissionSeasons: [],
    },
    facilityData: {
      itemList: [],
      overview: "",
      imageData: {coverUrl: "", thumbnailUrl: "", imageList: []},
    },
    resourceDistributionData: {
      allocations: [],
    },
  };
}

/** Parse `gallery` JSON string (hoặc array) từ BE → imageList UI */
function galleryStringToImageList(gallery) {
  if (gallery == null || gallery === "") return [];
  if (Array.isArray(gallery)) {
    return gallery.map((x) => ({
      url: x?.url != null ? String(x.url) : "",
      name: x?.name != null ? String(x.name) : "",
      altName: x?.altName != null ? String(x.altName ?? "") : "",
      isUsage: Boolean(x?.isUsage ?? true),
    }));
  }
  if (typeof gallery !== "string") return [];
  try {
    const p = JSON.parse(gallery);
    if (!Array.isArray(p)) return [];
    return p.map((x) => ({
      url: x?.url != null ? String(x.url) : "",
      name: x?.name != null ? String(x.name) : "",
      altName: x?.altName != null ? String(x.altName ?? "") : "",
      isUsage: true,
    }));
  } catch {
    return [];
  }
}

function imageListFromFacilityImageBlock(img) {
  if (!img || typeof img !== "object") return [];
  if (Array.isArray(img.imageList) && img.imageList.length > 0) return img.imageList;
  return galleryStringToImageList(img.gallery);
}

function sanitizeCampusPutItemList(itemList) {
  if (!Array.isArray(itemList)) return [];
  return itemList.map((it) => ({
    facilityCode: it.facilityCode != null ? String(it.facilityCode).trim() : "",
    name: it.name != null ? String(it.name) : "",
    value: it.value != null ? Number(it.value) || 0 : 0,
    unit: it.unit != null ? String(it.unit) : "",
    category: it.category != null ? String(it.category) : "",
  }));
}

/** PUT /campus/{id}/config — `imageJsonData`: { coverUrl, imageList } */
function buildImageJsonDataForCampusPut(imageData) {
  const img = imageData && typeof imageData === "object" ? imageData : {};
  const coverUrl =
    img.coverUrl != null && String(img.coverUrl).trim() !== ""
      ? String(img.coverUrl).trim()
      : img.cover != null && String(img.cover).trim() !== ""
        ? String(img.cover).trim()
        : "";
  const list = Array.isArray(img.imageList) ? img.imageList : [];
  return {
    coverUrl,
    imageList: list.map((im) => {
      const row = {
        url: im?.url != null ? String(im.url) : "",
        name: im?.name != null ? String(im.name) : "",
        altName: im?.altName != null ? String(im.altName ?? "") : "",
      };
      if (im && Object.prototype.hasOwnProperty.call(im, "isUsage")) {
        row.isUsage = Boolean(im.isUsage);
      }
      return row;
    }),
  };
}

/** So sánh ổn định cho PUT campus — tránh bỏ sót khi `JSON.stringify` cả `facilityData` không đổi nhưng `itemList` đã đổi. */
function campusFacilityPutSlice(fac) {
  const f = fac && typeof fac === "object" ? fac : {};
  return {
    overview: f.overview != null ? String(f.overview) : "",
    itemList: sanitizeCampusPutItemList(f.itemList),
    imageJsonData: buildImageJsonDataForCampusPut(f.imageData),
  };
}

/**
 * BE trả song song `facilityData` (đã lưu) và `facility_template` (catalog mẫu).
 * Nếu trộn hai nhánh khi `facilityData` thiếu field (partial JSON), field đó sẽ bị lấy từ template
 * → UI như “quay về data cũ” sau GET/Lưu dù PUT đúng.
 * Quy tắc: có `facilityData` / `facility_data` thì CHỈ dùng object đó; thiếu key = rỗng, không fallback template.
 * Chỉ dùng `facility_template` khi không có nhánh facilityData.
 */
function mergeFacilityFromBody(body) {
  const tpl = body.facility_template && typeof body.facility_template === "object" ? body.facility_template : {};
  const rawDat =
    (body.facilityData && typeof body.facilityData === "object" ? body.facilityData : null) ||
    (body.facility_data && typeof body.facility_data === "object" ? body.facility_data : null);

  function coverUrlFromImageData(imgObj) {
    if (!imgObj || typeof imgObj !== "object") return "";
    if (imgObj.coverUrl != null && String(imgObj.coverUrl).trim() !== "") return String(imgObj.coverUrl).trim();
    if (imgObj.cover != null && String(imgObj.cover).trim() !== "") return String(imgObj.cover).trim();
    return "";
  }

  if (rawDat) {
    const img = rawDat.imageData && typeof rawDat.imageData === "object" ? rawDat.imageData : {};
    return {
      itemList: Array.isArray(rawDat.itemList) ? rawDat.itemList : [],
      overview: rawDat.overview != null ? String(rawDat.overview) : "",
      imageData: {
        coverUrl: coverUrlFromImageData(img),
        thumbnailUrl: img.thumbnailUrl != null ? String(img.thumbnailUrl) : "",
        imageList: imageListFromFacilityImageBlock(img),
      },
    };
  }

  const imgTpl = tpl.imageData && typeof tpl.imageData === "object" ? tpl.imageData : {};
  return {
    itemList: Array.isArray(tpl.itemList) ? tpl.itemList : [],
    overview: tpl.overview != null ? String(tpl.overview) : "",
    imageData: {
      coverUrl: coverUrlFromImageData(imgTpl),
      thumbnailUrl: imgTpl.thumbnailUrl != null ? String(imgTpl.thumbnailUrl) : "",
      imageList: imageListFromFacilityImageBlock(imgTpl),
    },
  };
}

/** Ưu tiên object camelCase (PUT) nếu có key; không thì dùng snake_case từ GET đầy đủ */
function pickSection(body, camelKey, snakeKey) {
  const camel = body[camelKey];
  const snake = body[snakeKey];
  const c = camel && typeof camel === "object" ? camel : null;
  const s = snake && typeof snake === "object" ? snake : null;
  if (c && Object.keys(c).length) return c;
  if (s && Object.keys(s).length) return s;
  return c || s || {};
}

/** Một dòng hồ sơ: { code, name, required } */
function normalizeDocItem(d) {
  if (!d || typeof d !== "object") return {code: "", name: "", required: false};
  return {
    code: d.code != null ? String(d.code) : "",
    name: d.name != null ? String(d.name) : "",
    required: Boolean(d.required),
  };
}

function normalizeMandatoryImportRow(item, fallbackIndex = 1) {
  const raw = item && typeof item === "object" ? item : {};
  const sourceRowData = raw.rowData && typeof raw.rowData === "object" ? raw.rowData : raw;
  const normalizedDoc = normalizeDocItem(sourceRowData);
  const resolvedIndex = sourceRowData.index != null && !Number.isNaN(Number(sourceRowData.index))
    ? Number(sourceRowData.index)
    : fallbackIndex;
  return {
    rowData: {
      index: resolvedIndex,
      code: normalizedDoc.code,
      name: normalizedDoc.name,
      required: true,
    },
    error: raw.error && typeof raw.error === "object" ? raw.error : null,
    isError: Boolean(raw.isError),
  };
}

function mandatoryImportRowErrorText(row) {
  const fields = Array.isArray(row?.error?.fields) ? row.error.fields : [];
  if (!fields.length) return "";
  return fields
    .map((f) => String(f?.message ?? "").trim())
    .filter(Boolean)
    .join(". ");
}

function mandatoryImportFieldErrorText(row, fieldName) {
  const fields = Array.isArray(row?.error?.fields) ? row.error.fields : [];
  const normalizedField = String(fieldName ?? "").trim();
  if (!normalizedField) return "";
  const hit = fields.find((f) => String(f?.name ?? "").trim() === normalizedField);
  return hit?.message != null ? String(hit.message) : "";
}

/**
 * Một nhóm theo phương thức (contract BE):
 * { "methodCode": "ACADEMIC_RECORD", "documents": [{ "code", "name", "required" }] }
 */
function normalizeByMethodGroup(g) {
  if (!g || typeof g !== "object") return {methodCode: "", documents: []};
  const methodCode =
    g.methodCode != null && String(g.methodCode).trim() !== ""
      ? String(g.methodCode).trim()
      : g.method_code != null && String(g.method_code).trim() !== ""
        ? String(g.method_code).trim()
        : "";
  const documents = Array.isArray(g.documents) ? g.documents.map(normalizeDocItem) : [];
  return {methodCode, documents};
}

/** Một bước trong quy trình theo phương thức (GET admissionProcesses / PUT methodAdmissionProcess). */
function normalizeAdmissionProcessStep(s, i) {
  if (!s || typeof s !== "object") {
    return {stepOrder: i + 1, stepName: "", description: ""};
  }
  return {
    stepOrder: s.stepOrder != null && !Number.isNaN(Number(s.stepOrder)) ? Number(s.stepOrder) : i + 1,
    stepName: s.stepName != null ? String(s.stepName) : "",
    description: s.description != null ? String(s.description) : "",
  };
}

function normalizeMethodAdmissionProcessGroup(g) {
  if (!g || typeof g !== "object") return {methodCode: "", steps: []};
  const methodCode =
    g.methodCode != null && String(g.methodCode).trim() !== ""
      ? String(g.methodCode).trim()
      : g.method_code != null && String(g.method_code).trim() !== ""
        ? String(g.method_code).trim()
        : "";
  const steps = Array.isArray(g.steps) ? g.steps.map((s, idx) => normalizeAdmissionProcessStep(s, idx)) : [];
  return {methodCode, steps};
}

function groupFlatMethodDocuments(rows) {
  const grouped = new Map();
  for (const row of rows || []) {
    if (!row || typeof row !== "object") continue;
    const methodCode = String(row?.methodCode ?? row?.method_code ?? "").trim();
    if (!methodCode) continue;
    const doc = normalizeDocItem(row);
    if (!doc.code.trim() && !doc.name.trim()) continue;
    const prev = grouped.get(methodCode) || [];
    prev.push({...doc, required: true});
    grouped.set(methodCode, prev);
  }
  return Array.from(grouped.entries()).map(([methodCode, documents]) => ({
    methodCode,
    documents,
  }));
}

function groupFlatAdmissionProcesses(rows) {
  const grouped = new Map();
  for (const row of rows || []) {
    if (!row || typeof row !== "object") continue;
    const methodCode = String(row?.methodCode ?? row?.method_code ?? "").trim();
    if (!methodCode) continue;
    const prev = grouped.get(methodCode) || [];
    prev.push(row);
    grouped.set(methodCode, prev);
  }
  return Array.from(grouped.entries()).map(([methodCode, stepsRaw]) => ({
    methodCode,
    steps: stepsRaw
      .map((step, idx) => normalizeAdmissionProcessStep(step, idx))
      .sort((a, b) => Number(a.stepOrder || 0) - Number(b.stepOrder || 0)),
  }));
}

function normalizeAcademicDate(value) {
  if (value == null) return "";
  if (Array.isArray(value) && value.length >= 3) {
    const [y, m, d] = value;
    if (Number.isFinite(Number(y)) && Number.isFinite(Number(m)) && Number.isFinite(Number(d))) {
      const pad = (n) => String(Math.trunc(Number(n))).padStart(2, "0");
      return `${Number(y)}-${pad(m)}-${pad(d)}`;
    }
    return "";
  }
  const s = String(value).trim();
  if (!s) return "";
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function normalizeAcademicTerm(term) {
  if (!term || typeof term !== "object") return {start: "", end: ""};
  return {
    start: normalizeAcademicDate(term.start),
    end: normalizeAcademicDate(term.end),
  };
}

function normalizeAcademicCalendar(raw, fallback) {
  const fb = fallback && typeof fallback === "object" ? fallback : {term1: {start: "", end: ""}, term2: {start: "", end: ""}};
  const src = raw && typeof raw === "object" ? raw : {};
  return {
    term1: normalizeAcademicTerm(src.term1 ?? fb.term1),
    term2: normalizeAcademicTerm(src.term2 ?? fb.term2),
  };
}

function normalizeSeasonExtraShift(s) {
  if (!s || typeof s !== "object") return {name: "", startTime: "", endTime: ""};
  const rawName = s.name != null ? String(s.name) : "";
  const c = canonicalizeWorkShiftName(rawName);
  return {
    name: WORK_SHIFT_TYPE_CODES.includes(c) ? c : rawName.trim(),
    startTime: normalizeTimeHHmm(s.startTime),
    endTime: normalizeTimeHHmm(s.endTime),
  };
}

function normalizeAdmissionSeasonRow(r) {
  if (!r || typeof r !== "object") {
    return {
      seasonName: "",
      startDate: "",
      endDate: "",
      enableSunday: false,
      minCounsellorMultiplier: 1,
      note: "",
      extraShifts: [],
    };
  }
  const mult = r.minCounsellorMultiplier != null && !Number.isNaN(Number(r.minCounsellorMultiplier))
    ? Number(r.minCounsellorMultiplier)
    : 1;
  const extra =
    Array.isArray(r.extraShifts)
      ? r.extraShifts
      : Array.isArray(r.extra_shifts)
        ? r.extra_shifts
        : [];
  return {
    seasonName: r.seasonName != null ? String(r.seasonName) : "",
    startDate: normalizeAcademicDate(r.startDate ?? r.start_date),
    endDate: normalizeAcademicDate(r.endDate ?? r.end_date),
    enableSunday: Boolean(r.enableSunday ?? r.enable_sunday),
    minCounsellorMultiplier: mult >= 1 ? mult : 1,
    note: r.note != null ? String(r.note) : "",
    extraShifts: extra.map(normalizeSeasonExtraShift),
  };
}

function normalizeAdmissionSeasonsList(raw, fallback) {
  const fb = Array.isArray(fallback) ? fallback : [];
  if (!Array.isArray(raw)) return fb.map((x) => normalizeAdmissionSeasonRow(x));
  return raw.map((x) => normalizeAdmissionSeasonRow(x));
}

function parseYmdLocalSchoolConfig(ymd) {
  if (!ymd || typeof ymd !== "string") return null;
  const p = ymd.trim().split("-").map((x) => Number(x));
  if (p.length !== 3 || p.some((n) => !Number.isFinite(n))) return null;
  return new Date(p[0], p[1] - 1, p[2]);
}

function startOfTodayLocalSchoolConfig() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatViDateFromYmd(ymd) {
  const t = parseYmdLocalSchoolConfig(ymd);
  if (!t || Number.isNaN(t.getTime())) return "";
  return t.toLocaleDateString("vi-VN", {day: "2-digit", month: "2-digit", year: "numeric"});
}

/** So sánh theo ngày local: Đang diễn ra / Sắp tới / Đã kết thúc */
function admissionSeasonStatusMeta(startStr, endStr) {
  const s = parseYmdLocalSchoolConfig(startStr);
  const e = parseYmdLocalSchoolConfig(endStr);
  if (!s || !e) return {label: "Chưa đủ ngày", color: "default"};
  const today = startOfTodayLocalSchoolConfig();
  const sd = new Date(s.getFullYear(), s.getMonth(), s.getDate());
  const ed = new Date(e.getFullYear(), e.getMonth(), e.getDate());
  if (ed < today) return {label: "Đã kết thúc", color: "default"};
  if (sd > today) return {label: "Sắp tới", color: "info"};
  return {label: "Đang diễn ra", color: "success"};
}

function normalizeOperationSettingsFromApi(op, fallback) {
  const fb = fallback && typeof fallback === "object" ? fallback : defaultConfig().operationSettingsData;
  const src = op && typeof op === "object" ? op : {};
  const workingRaw =
    src.workingConfig && typeof src.workingConfig === "object"
      ? src.workingConfig
      : src.working_config && typeof src.working_config === "object"
        ? src.working_config
        : {};
  return {
    ...fb,
    hotline: src.hotline != null ? String(src.hotline) : fb.hotline,
    emailSupport: src.emailSupport != null ? String(src.emailSupport) : fb.emailSupport,
    maxBookingPerSlot:
      src.maxBookingPerSlot != null && !Number.isNaN(Number(src.maxBookingPerSlot))
        ? Number(src.maxBookingPerSlot)
        : fb.maxBookingPerSlot,
    minCounsellorPerSlot:
      src.minCounsellorPerSlot != null && !Number.isNaN(Number(src.minCounsellorPerSlot))
        ? Number(src.minCounsellorPerSlot)
        : fb.minCounsellorPerSlot,
    maxCounsellorsPerSlot:
      src.maxCounsellorsPerSlot != null && !Number.isNaN(Number(src.maxCounsellorsPerSlot))
        ? Number(src.maxCounsellorsPerSlot)
        : src.max_counsellors_per_slot != null && !Number.isNaN(Number(src.max_counsellors_per_slot))
          ? Number(src.max_counsellors_per_slot)
          : fb.maxCounsellorsPerSlot,
    slotDurationInMinutes:
      src.slotDurationInMinutes != null && !Number.isNaN(Number(src.slotDurationInMinutes))
        ? Number(src.slotDurationInMinutes)
        : fb.slotDurationInMinutes,
    bufferBetweenSlotsMinutes:
      src.bufferBetweenSlotsMinutes != null && !Number.isNaN(Number(src.bufferBetweenSlotsMinutes))
        ? Number(src.bufferBetweenSlotsMinutes)
        : src.buffer_between_slots_minutes != null && !Number.isNaN(Number(src.buffer_between_slots_minutes))
          ? Number(src.buffer_between_slots_minutes)
          : fb.bufferBetweenSlotsMinutes,
    allowBookingBeforeHours:
      src.allowBookingBeforeHours != null && !Number.isNaN(Number(src.allowBookingBeforeHours))
        ? Number(src.allowBookingBeforeHours)
        : fb.allowBookingBeforeHours,
    workingConfig: {
      ...fb.workingConfig,
      note: workingRaw.note != null ? String(workingRaw.note) : fb.workingConfig.note,
      workShifts: Array.isArray(workingRaw.workShifts)
        ? workingRaw.workShifts.map((row) => {
            const r = row && typeof row === "object" ? row : {};
            const rawName = r.name != null ? String(r.name) : "";
            const c = canonicalizeWorkShiftName(rawName);
            return {
              name: WORK_SHIFT_TYPE_CODES.includes(c) ? c : rawName.trim(),
              startTime: normalizeTimeHHmm(r.startTime),
              endTime: normalizeTimeHHmm(r.endTime),
            };
          })
        : fb.workingConfig.workShifts,
      regularDays: Array.isArray(workingRaw.regularDays) ? workingRaw.regularDays : fb.workingConfig.regularDays,
      weekendDays: Array.isArray(workingRaw.weekendDays) ? workingRaw.weekendDays : fb.workingConfig.weekendDays,
      isOpenSunday: Boolean(
        workingRaw.isOpenSunday ??
        workingRaw.openSunday ??
        fb.workingConfig.isOpenSunday
      ),
    },
    academicCalendar: normalizeAcademicCalendar(src.academicCalendar ?? src.academic_calendar, fb.academicCalendar),
    methodAdmissionProcess: parseMethodAdmissionProcessFromOperation(src),
    admissionSeasons: normalizeAdmissionSeasonsList(
      src.admissionSeasons ?? src.admission_seasons,
      fb.admissionSeasons
    ),
  };
}

/**
 * GET: `admissionProcesses` [{ methodCode, steps }].
 * Legacy: `admissionSteps` phẳng → một nhóm methodCode rỗng.
 */
function parseMethodAdmissionProcessFromOperation(op) {
  if (!op || typeof op !== "object") return [];
  const raw = Array.isArray(op.admissionProcesses)
    ? op.admissionProcesses
    : Array.isArray(op.admission_processes)
      ? op.admission_processes
      : Array.isArray(op.methodAdmissionProcess)
        ? op.methodAdmissionProcess
        : Array.isArray(op.method_admission_process)
          ? op.method_admission_process
          : null;
  if (raw) return raw.map(normalizeMethodAdmissionProcessGroup);
  const legacyFlat = Array.isArray(op.admissionSteps) ? op.admissionSteps : Array.isArray(op.admission_steps) ? op.admission_steps : null;
  if (legacyFlat) {
    return [
      {
        methodCode: "",
        steps: legacyFlat.map((s, idx) => normalizeAdmissionProcessStep(s, idx)),
      },
    ];
  }
  return [];
}

/** Gửi PUT đúng shape, bỏ field thừa */
function sanitizeDocumentRequirementsForApi(data) {
  if (!data || typeof data !== "object") return {mandatoryAll: [], byMethod: []};
  const mandatoryAll = Array.isArray(data.mandatoryAll)
    ? data.mandatoryAll.map((d) => {
        const x = normalizeDocItem(d);
        return {code: x.code.trim(), name: x.name.trim(), required: true};
      })
    : [];
  const byMethod = Array.isArray(data.byMethod)
    ? data.byMethod.map((g) => {
        const ng = normalizeByMethodGroup(g);
        const documents = ng.documents.map((d) => {
          const x = normalizeDocItem(d);
          return {code: x.code.trim(), name: x.name.trim(), required: x.required};
        });
        return {
          documents,
          methodCode: ng.methodCode.trim(),
        };
      })
    : [];
  return {mandatoryAll, byMethod};
}

function sanitizeQuotaConfigForApi(q) {
  if (!q || typeof q !== "object") return q;
  return {
    academicYear: q.academicYear != null ? String(q.academicYear) : "",
    totalSystemQuota: q.totalSystemQuota != null ? Number(q.totalSystemQuota) || 0 : 0,
    campusAssignments: Array.isArray(q.campusAssignments)
      ? q.campusAssignments.map((a) => ({
          campusId: a.campusId != null ? Number(a.campusId) : null,
          campusName: a.campusName != null ? String(a.campusName) : "",
          allocatedQuota: a.allocatedQuota != null ? Number(a.allocatedQuota) || 0 : 0,
        }))
      : [],
  };
}

function formatVndDisplay(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return "";
  return `${new Intl.NumberFormat("vi-VN").format(Number(amount))} VNĐ`;
}

function normalizeFeeItemFromApi(item) {
  if (!item || typeof item !== "object") return null;
  const code = item.feeCode != null ? String(item.feeCode).trim() : "";
  if (!code) return null;
  const amt = item.amount != null ? Number(item.amount) || 0 : 0;
  return {
    feeCode: code,
    feeName: item.feeName != null ? String(item.feeName) : "",
    amount: amt,
    currency: item.currency != null ? String(item.currency) : "VND",
    display: item.display != null && String(item.display).trim() !== "" ? String(item.display) : formatVndDisplay(amt),
    isReservationFee: Boolean(item.isReservationFee),
    isMandatory: Boolean(item.isMandatory),
    description: item.description != null ? String(item.description) : "",
  };
}

function sanitizeFeeItemForApi(item) {
  if (!item || typeof item !== "object") return null;
  const code = item.feeCode != null ? String(item.feeCode).trim() : "";
  if (!code) return null;
  const amt = item.amount != null ? Number(item.amount) || 0 : 0;
  return {
    feeCode: code,
    feeName: item.feeName != null ? String(item.feeName) : "",
    amount: amt,
    currency: item.currency != null ? String(item.currency) : "VND",
    display: item.display != null && String(item.display).trim() !== "" ? String(item.display) : formatVndDisplay(amt),
    isReservationFee: Boolean(item.isReservationFee),
    isMandatory: Boolean(item.isMandatory),
    description: item.description != null ? String(item.description) : "",
  };
}

/**
 * BE lưu `priceAdjustment` dạng phân số (0.1 = 10% trên UI).
 * Nếu API cũ trả số nguyên phần trăm (vd. 15 = 15%) thì |n| > 1 → giữ nguyên cho UI.
 */
function priceAdjustmentPercentFromApi(v) {
  if (v == null || v === "") return v;
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  if (Math.abs(n) <= 1) return n * 100;
  return n;
}

/** UI nhập % (10) → gửi BE (0.1). */
function priceAdjustmentPercentToApi(v) {
  if (v == null || v === "") return v;
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return n / 100;
}

/** GET → state: `feeItems` theo contract; legacy `reservationFee` → tạo một dòng RESERVATION_FEE. */
function normalizeFinancePolicySection(fin, defaults) {
  const f = fin && typeof fin === "object" ? fin : {};
  const rawItems = Array.isArray(f.feeItems) ? f.feeItems.map(normalizeFeeItemFromApi).filter(Boolean) : [];
  const resFee = f.reservationFee && typeof f.reservationFee === "object" ? f.reservationFee : {};
  let feeItems = rawItems;
  if (feeItems.length === 0 && (Number(resFee.amount) > 0 || (resFee.display != null && String(resFee.display).trim() !== ""))) {
    const amt = resFee.amount != null ? Number(resFee.amount) || 0 : 0;
    feeItems = [
      {
        feeCode: "RESERVATION_FEE",
        feeName: "Phí giữ chỗ (Xác nhận nhập học)",
        amount: amt,
        currency: resFee.currency != null ? String(resFee.currency) : "VND",
        display: resFee.display != null && String(resFee.display).trim() !== "" ? String(resFee.display) : formatVndDisplay(amt),
        isReservationFee: true,
        isMandatory: true,
        description:
          "Phí bắt buộc để giữ chỗ sau khi trúng tuyển. Khoản này sẽ được trừ vào học phí chính thức.",
      },
    ];
  }
  const resRow = feeItems.find((i) => i.feeCode === "RESERVATION_FEE" || i.isReservationFee);
  const reservationFee = {
    amount: resRow ? Number(resRow.amount) || 0 : Number(resFee.amount) || 0,
    display: resRow
      ? resRow.display || formatVndDisplay(resRow.amount)
      : resFee.display != null && String(resFee.display).trim() !== ""
        ? String(resFee.display)
        : formatVndDisplay(resFee.amount ?? 0),
    currency: resRow?.currency || (resFee.currency != null ? String(resFee.currency) : "VND") || "VND",
  };
  const pa = f.priceAdjustment && typeof f.priceAdjustment === "object" ? f.priceAdjustment : {};
  const minFromApi = pa.minPercent != null ? priceAdjustmentPercentFromApi(pa.minPercent) : defaults.priceAdjustment.minPercent;
  const maxFromApi = pa.maxPercent != null ? priceAdjustmentPercentFromApi(pa.maxPercent) : defaults.priceAdjustment.maxPercent;
  return {
    paymentNotes: f.paymentNotes != null ? String(f.paymentNotes) : defaults.paymentNotes,
    feeItems,
    reservationFee,
    priceAdjustment: {
      minPercent: typeof minFromApi === "number" && Number.isFinite(minFromApi) ? minFromApi : defaults.priceAdjustment.minPercent,
      maxPercent: typeof maxFromApi === "number" && Number.isFinite(maxFromApi) ? maxFromApi : defaults.priceAdjustment.maxPercent,
    },
  };
}

/**
 * PUT financePolicyData: chỉ gửi field / feeItems thực sự đổi so với snapshot ban đầu
 * (BE giữ nguyên phần không có trong body).
 */
function feeItemsWithCodes(items) {
  return (Array.isArray(items) ? items : []).filter((row) => row && String(row.feeCode ?? "").trim() !== "");
}

function feeCodeSetFromItems(items) {
  return new Set(feeItemsWithCodes(items).map((row) => String(row.feeCode).trim()));
}

function buildPartialFinancePolicyPayload(cur, init) {
  const c = cur && typeof cur === "object" ? cur : {};
  const i = init && typeof init === "object" ? init : {};
  const out = {};

  const pnC = c.paymentNotes != null ? String(c.paymentNotes) : "";
  const pnI = i.paymentNotes != null ? String(i.paymentNotes) : "";
  if (pnC !== pnI) out.paymentNotes = pnC;

  const cpa = c.priceAdjustment && typeof c.priceAdjustment === "object" ? c.priceAdjustment : {};
  const ipa = i.priceAdjustment && typeof i.priceAdjustment === "object" ? i.priceAdjustment : {};
  const minC = Number(cpa.minPercent) || 0;
  const maxC = Number(cpa.maxPercent) || 0;
  const minI = Number(ipa.minPercent) || 0;
  const maxI = Number(ipa.maxPercent) || 0;
  if (minC !== minI || maxC !== maxI) {
    out.priceAdjustment = {
      minPercent: priceAdjustmentPercentToApi(minC),
      maxPercent: priceAdjustmentPercentToApi(maxC),
    };
  }

  const curItems = Array.isArray(c.feeItems) ? c.feeItems : [];
  const initItems = Array.isArray(i.feeItems) ? i.feeItems : [];
  const curCoded = feeItemsWithCodes(curItems);
  const initCoded = feeItemsWithCodes(initItems);
  const curSet = feeCodeSetFromItems(curItems);
  const initSet = feeCodeSetFromItems(initItems);
  const structuralChange =
    curCoded.length !== initCoded.length || [...initSet].some((code) => !curSet.has(code)) || [...curSet].some((code) => !initSet.has(code));

  if (structuralChange) {
    out.feeItems = curCoded.map((row) => sanitizeFeeItemForApi(row)).filter(Boolean);
  } else {
    const initMap = new Map(initCoded.map((row) => [String(row.feeCode).trim(), row]));
    const changedFeeItems = [];
    for (const row of curCoded) {
      const code = String(row.feeCode).trim();
      const prev = initMap.get(code);
      const sRow = sanitizeFeeItemForApi(row);
      const sPrev = prev ? sanitizeFeeItemForApi(prev) : null;
      if (!sPrev || JSON.stringify(sRow) !== JSON.stringify(sPrev)) {
        changedFeeItems.push(sRow);
      }
    }
    if (changedFeeItems.length > 0) out.feeItems = changedFeeItems;
  }

  return out;
}

function emptyFinanceFeeItem() {
  return {
    feeCode: "",
    feeName: "",
    amount: "",
    currency: "VND",
    display: "",
    isReservationFee: false,
    isMandatory: false,
    description: "",
  };
}

function reservationFeeSnapshotFromItems(feeItems) {
  const resRow = (Array.isArray(feeItems) ? feeItems : []).find((it) => it.feeCode === "RESERVATION_FEE" || it.isReservationFee);
  if (!resRow) {
    return {amount: 0, display: "", currency: "VND"};
  }
  const amt = resRow.amount != null ? Number(resRow.amount) || 0 : 0;
  return {
    amount: amt,
    display: resRow.display != null && String(resRow.display).trim() !== "" ? String(resRow.display) : formatVndDisplay(amt),
    currency: resRow.currency != null ? String(resRow.currency) : "VND",
  };
}

/** Chỉ một dòng được `isReservationFee: true`. */
function mapFeeItemsExclusiveReservation(items, index, checked) {
  const list = Array.isArray(items) ? items.map((r) => ({...(r && typeof r === "object" ? r : {})})) : [];
  if (index < 0 || index >= list.length) return list;
  if (checked) {
    return list.map((row, i) => ({...row, isReservationFee: i === index}));
  }
  return list.map((row, i) => (i === index ? {...row, isReservationFee: false} : row));
}

function sanitizeOperationSettingsForApi(op) {
  if (!op || typeof op !== "object") return op;
  const wc = op.workingConfig && typeof op.workingConfig === "object" ? op.workingConfig : {};
  const shifts = Array.isArray(wc.workShifts) ? wc.workShifts.map((s) => normalizeWorkShiftForApi(s)) : [];
  const numOr = (v, fallback) =>
    v != null && !Number.isNaN(Number(v)) ? Number(v) : fallback;

  const openSunday = Boolean(wc.isOpenSunday ?? wc.openSunday);

  const calIn = normalizeAcademicCalendar(op.academicCalendar);
  const academicCalendar = isAcademicCalendarLimitActive(calIn)
    ? {
        term1: termIsComplete(calIn.term1) ? {start: calIn.term1.start, end: calIn.term1.end} : {start: "", end: ""},
        term2: termIsComplete(calIn.term2) ? {start: calIn.term2.start, end: calIn.term2.end} : {start: "", end: ""},
      }
    : null;

  const admissionSeasons = Array.isArray(op.admissionSeasons)
    ? op.admissionSeasons
        .map((r) => normalizeAdmissionSeasonRow(r))
        .map((nr) => ({
          seasonName: nr.seasonName,
          startDate: nr.startDate,
          endDate: nr.endDate,
          enableSunday: nr.enableSunday,
          minCounsellorMultiplier: nr.minCounsellorMultiplier,
          note: nr.note,
          extraShifts: (nr.extraShifts || []).map((s) => normalizeWorkShiftForApi(s)),
        }))
        .filter(
          (row) =>
            String(row.seasonName ?? "").trim() !== "" ||
            String(row.startDate ?? "").trim() !== "" ||
            String(row.endDate ?? "").trim() !== ""
        )
    : [];

  return {
    hotline: op.hotline != null ? String(op.hotline) : "",
    emailSupport: op.emailSupport != null ? String(op.emailSupport) : "",
    maxBookingPerSlot: numOr(op.maxBookingPerSlot, 1),
    minCounsellorPerSlot: numOr(op.minCounsellorPerSlot, 1),
    maxCounsellorsPerSlot: numOr(op.maxCounsellorsPerSlot, 0),
    slotDurationInMinutes: numOr(op.slotDurationInMinutes, 30),
    bufferBetweenSlotsMinutes: numOr(op.bufferBetweenSlotsMinutes, 0),
    allowBookingBeforeHours: numOr(op.allowBookingBeforeHours, 24),
    workingConfig: {
      note: wc.note != null ? String(wc.note) : "",
      workShifts: shifts,
      regularDays: Array.isArray(wc.regularDays) ? wc.regularDays.map(String) : [],
      weekendDays: Array.isArray(wc.weekendDays) ? wc.weekendDays.map(String) : [],
      openSunday,
    },
    academicCalendar,
    admissionSeasons,
  };
}

function sanitizeFacilityDataForApi(f) {
  if (!f || typeof f !== "object") return f;
  const itemList = Array.isArray(f.itemList)
    ? f.itemList.map((it) => {
        const row = {
          facilityCode: it.facilityCode != null ? String(it.facilityCode).trim() : "",
          name: it.name != null ? String(it.name) : "",
          value: it.value != null ? Number(it.value) || 0 : 0,
          unit: it.unit != null ? String(it.unit) : "",
          category: it.category != null ? String(it.category) : "",
        };
        if (it.isUsage != null) row.isUsage = Boolean(it.isUsage);
        if (it.isCustom != null) row.isCustom = Boolean(it.isCustom);
        return row;
      })
    : [];
  const img = f.imageData && typeof f.imageData === "object" ? f.imageData : {};
  const coverUrl =
    img.coverUrl != null && String(img.coverUrl).trim() !== ""
      ? String(img.coverUrl).trim()
      : img.cover != null && String(img.cover).trim() !== ""
        ? String(img.cover).trim()
        : "";
  const thumbnailUrl = img.thumbnailUrl != null ? String(img.thumbnailUrl).trim() : "";
  const baseList = imageListFromFacilityImageBlock(img);
  const imageList = baseList.map((im) => {
    const o = {
      url: im.url != null ? String(im.url) : "",
      name: im.name != null ? String(im.name) : "",
      altName: im.altName != null ? String(im.altName) : "",
      isUsage: Boolean(im.isUsage ?? im.usage ?? true),
    };
    if (Object.prototype.hasOwnProperty.call(im, "uploadDate")) {
      o.uploadDate = im.uploadDate;
    }
    return o;
  });
  const out = {
    itemList,
    overview: f.overview != null ? String(f.overview) : "",
    imageData: {
      coverUrl,
      imageList,
    },
  };
  const th = img.thumbnailUrl != null ? String(img.thumbnailUrl).trim() : "";
  if (th) out.imageData.thumbnailUrl = th;
  return out;
}

function normalizeResourceAllocationRow(a) {
  if (!a || typeof a !== "object") return {resourceType: "", campusId: null, allocatedAmount: 0};
  const rawRt =
    a.resourceType != null && String(a.resourceType).trim() !== ""
      ? String(a.resourceType).trim()
      : a.resource_type != null && String(a.resource_type).trim() !== ""
        ? String(a.resource_type).trim()
        : "";
  let resourceType = canonicalResourceType(rawRt);
  const rawCampus = a.campusId != null ? a.campusId : a.campus_id;
  const campusId =
    rawCampus != null && rawCampus !== "" && !Number.isNaN(Number(rawCampus)) ? Number(rawCampus) : null;
  const rawAmt = a.allocatedAmount != null ? a.allocatedAmount : a.allocated_amount;
  const allocatedAmount = rawAmt != null && !Number.isNaN(Number(rawAmt)) ? Number(rawAmt) : 0;
  if (resourceType !== "" && !isKnownResourceTypeValue(resourceType)) {
    resourceType = RESOURCE_TYPE_OPTIONS[0]?.value ?? "counsellor";
  }
  if (campusId != null && resourceType === "") {
    resourceType = RESOURCE_TYPE_OPTIONS[0]?.value ?? "counsellor";
  }
  return {resourceType, campusId, allocatedAmount};
}

function sanitizeResourceDistributionDataForApi(rd) {
  const rows = Array.isArray(rd?.allocations) ? rd.allocations : [];
  const allocations = rows
    .map((a) => normalizeResourceAllocationRow(a))
    .filter((row) => isKnownResourceTypeValue(row.resourceType) && row.campusId != null);
  return {allocations};
}

/** Gộp admission_settings (snake) với admissionSettingsData — bỏ key lạ như itemList: boolean */
function mergeAdmissionFromBody(body) {
  const camel = body.admissionSettingsData && typeof body.admissionSettingsData === "object" ? body.admissionSettingsData : {};
  const snake = body.admission_settings && typeof body.admission_settings === "object" ? body.admission_settings : {};
  const merged = {...snake, ...camel};
  if ("itemList" in merged && typeof merged.itemList !== "object") {
    delete merged.itemList;
  }
  return merged;
}

function normalizeFromApi(body) {
  const d = defaultConfig();
  if (!body || typeof body !== "object") return d;

  const adm = mergeAdmissionFromBody(body);
  const quota = pickSection(body, "quotaConfigData", "quota_config");
  const fin = pickSection(body, "financePolicyData", "finance_policy");
  const doc = pickSection(body, "documentRequirementsData", "document_requirements");
  const op = pickSection(body, "operationSettingsData", "operation_settings");
  const fac = mergeFacilityFromBody(body);
  const rd = pickSection(body, "resourceDistributionData", "resource_distribution_data");

  const imageData = fac.imageData && typeof fac.imageData === "object" ? fac.imageData : {};
  const allocations = Array.isArray(rd?.allocations) ? rd.allocations.map(normalizeResourceAllocationRow) : [];

  return {
    admissionSettingsData: {
      ...d.admissionSettingsData,
      ...adm,
      availableMethods: Array.isArray(adm.availableMethods)
        ? adm.availableMethods
        : Array.isArray(adm.available_methods)
          ? adm.available_methods
          : d.admissionSettingsData.availableMethods,
      allowedMethods: Array.isArray(adm.allowedMethods)
        ? adm.allowedMethods
        : Array.isArray(adm.allowed_methods)
          ? adm.allowed_methods
          : d.admissionSettingsData.allowedMethods,
      methodAdmissionProcess: parseMethodAdmissionProcessFromOperation(adm).length > 0
        ? parseMethodAdmissionProcessFromOperation(adm)
        : parseMethodAdmissionProcessFromOperation(op),
      autoCloseOnFull:
        typeof adm.autoCloseOnFull === "boolean" ? adm.autoCloseOnFull : d.admissionSettingsData.autoCloseOnFull,
      quotaAlertThresholdPercent:
        adm.quotaAlertThresholdPercent != null
          ? Number(adm.quotaAlertThresholdPercent)
          : d.admissionSettingsData.quotaAlertThresholdPercent,
    },
    quotaConfigData: {
      ...d.quotaConfigData,
      ...quota,
      campusAssignments: Array.isArray(quota.campusAssignments) ? quota.campusAssignments : d.quotaConfigData.campusAssignments,
    },
    financePolicyData: normalizeFinancePolicySection(fin, d.financePolicyData),
    documentRequirementsData: {
      ...d.documentRequirementsData,
      mandatoryAll: Array.isArray(doc.mandatoryAll)
        ? doc.mandatoryAll.map((item) => ({...normalizeDocItem(item), required: true}))
        : d.documentRequirementsData.mandatoryAll,
      byMethod: Array.isArray(doc.byMethod) ? doc.byMethod.map(normalizeByMethodGroup) : d.documentRequirementsData.byMethod,
    },
    operationSettingsData: normalizeOperationSettingsFromApi(op, d.operationSettingsData),
    facilityData: {
      itemList: Array.isArray(fac.itemList) ? fac.itemList : [],
      overview: fac.overview ?? "",
      imageData: {
        coverUrl: imageData.coverUrl ?? "",
        thumbnailUrl: imageData.thumbnailUrl ?? "",
        imageList: Array.isArray(imageData.imageList) ? imageData.imageList : [],
      },
    },
    resourceDistributionData: {
      ...d.resourceDistributionData,
      ...rd,
      allocations,
    },
  };
}

const CONFIG_SECTION_SANITIZERS = {
  admissionSettingsData: sanitizeAdmissionSettingsForApi,
  quotaConfigData: sanitizeQuotaConfigForApi,
  documentRequirementsData: sanitizeDocumentRequirementsForApi,
  operationSettingsData: sanitizeOperationSettingsForApi,
  facilityData: sanitizeFacilityDataForApi,
  resourceDistributionData: sanitizeResourceDistributionDataForApi,
};

function buildPartialPayload(current, initial) {
  const keys = [
    "admissionSettingsData",
    "quotaConfigData",
    "financePolicyData",
    "documentRequirementsData",
    "operationSettingsData",
    "facilityData",
    "resourceDistributionData",
  ];
  const out = {};
  for (const k of keys) {
    if (k === "financePolicyData") {
      try {
        if (JSON.stringify(current[k]) !== JSON.stringify(initial[k])) {
          const partialFin = buildPartialFinancePolicyPayload(current.financePolicyData, initial.financePolicyData);
          if (Object.keys(partialFin).length > 0) out[k] = partialFin;
        }
      } catch {
        const partialFin = buildPartialFinancePolicyPayload(current.financePolicyData, initial.financePolicyData);
        if (Object.keys(partialFin).length > 0) out[k] = partialFin;
      }
      continue;
    }
    try {
      if (JSON.stringify(current[k]) !== JSON.stringify(initial[k])) {
        const san = CONFIG_SECTION_SANITIZERS[k];
        out[k] = san ? san(current[k]) : current[k];
      }
    } catch {
      const san = CONFIG_SECTION_SANITIZERS[k];
      out[k] = san ? san(current[k]) : current[k];
    }
  }
  return out;
}

function getSectionKeysByTabSlug(tabSlug) {
  switch (String(tabSlug || "").trim()) {
    case "admission":
      return ["admissionSettingsData"];
    case "documents":
      return ["documentRequirementsData"];
    case "operation":
      return ["operationSettingsData"];
    case "finance":
      return ["financePolicyData"];
    case "facility":
      return ["facilityData"];
    case "quota":
      return ["quotaConfigData"];
    case "resource-distribution":
      return ["resourceDistributionData"];
    default:
      return [];
  }
}

function campusKey(c) {
  return c?.id ?? c?.campusId ?? c?.campusID;
}

function mergeQuotaRows(campuses, assignments) {
  const list = Array.isArray(campuses) ? campuses : [];
  const assign = Array.isArray(assignments) ? assignments : [];
  return list.map((c) => {
    const id = campusKey(c);
    const found = assign.find((a) => Number(a.campusId) === Number(id));
    return {
      campusId: id != null ? Number(id) : null,
      campusName: c.name ?? c.campusName ?? "Cơ sở",
      allocatedQuota: found?.allocatedQuota != null ? Number(found.allocatedQuota) : 0,
    };
  });
}

function pickSchoolIdFromCampuses(campuses) {
  if (!Array.isArray(campuses) || campuses.length === 0) return null;
  for (const c of campuses) {
    const sid = c?.schoolId ?? c?.school_id ?? c?.school?.id;
    if (sid != null && sid !== "") {
      const n = Number(sid);
      return Number.isFinite(n) ? n : sid;
    }
  }
  return null;
}

/** Campus chính để GET/PUT /campus/{id}/config (chỉ sửa cơ sở mình, không chọn campus khác). */
function pickPrimaryCampusIdFromCampuses(campuses) {
  if (!Array.isArray(campuses) || campuses.length === 0) return null;
  const primary = campuses.find((c) => c.isPrimaryBranch === true);
  const row = primary ?? campuses[0];
  const id = campusKey(row);
  if (id == null || id === "") return null;
  const n = Number(id);
  return Number.isFinite(n) ? n : id;
}

function parseBranchFacilityJson(raw) {
  if (raw == null) return null;
  if (typeof raw === "object") return raw;
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return null;
    try {
      return JSON.parse(t);
    } catch {
      return null;
    }
  }
  return null;
}

/** GET /api/v1/campus/config — envelope `body` (camelCase hoặc snake_case). */
function pickCampusConfigGetEnvelope(body) {
  if (!body || typeof body !== "object") {
    return {hqDefault: {}, campusCurrent: {}};
  }
  const hq = body.hqDefault ?? body.hq_default;
  const cur = body.campusCurrent ?? body.campus_current;
  return {
    hqDefault: hq && typeof hq === "object" ? hq : {},
    campusCurrent: cur && typeof cur === "object" ? cur : {},
  };
}

function campusCurrentPolicyDetailRendered(cur) {
  if (!cur || typeof cur !== "object") return null;
  return (
    (cur.policyDetailRendered && typeof cur.policyDetailRendered === "object" ? cur.policyDetailRendered : null) ||
    (cur.policy_detail_rendered && typeof cur.policy_detail_rendered === "object" ? cur.policy_detail_rendered : null)
  );
}

function policyFromCampusCurrent(cur) {
  if (!cur || typeof cur !== "object") return "";
  const pdr = campusCurrentPolicyDetailRendered(cur);
  if (pdr?.rawCustomNote != null && String(pdr.rawCustomNote).trim() !== "") return String(pdr.rawCustomNote);
  const flatPol = cur.policyDetail ?? cur.policy_detail;
  if (flatPol != null && String(flatPol).trim() !== "") return String(flatPol);
  return "";
}

/** GET campus/config — bản văn tổng hợp BE tạo sau khi lưu PUT (nguồn hiển thị “thật” cho user). */
function policyFullTextRenderedFromCampusCurrent(cur) {
  if (!cur || typeof cur !== "object") return "";
  const pdr = campusCurrentPolicyDetailRendered(cur);
  if (!pdr) return "";
  const ft = pdr.fullTextRendered ?? pdr.full_text_rendered;
  if (ft != null && String(ft).trim() !== "") return String(ft);
  return "";
}

/**
 * GET /campus/config — quy trình nhập học sau merge (BE), ưu tiên hơn `facilityJson.admissionStepsOverride`.
 * Hỗ trợ: admissionProcessesEffective / effectiveAdmissionProcesses (nhóm), admissionSteps (flat).
 */
function parseCampusCurrentEffectiveAdmissionProcesses(cur) {
  if (!cur || typeof cur !== "object") return null;
  const eff =
    cur.admissionProcessesEffective ??
    cur.admission_processes_effective ??
    cur.effectiveAdmissionProcesses ??
    cur.effective_admission_processes;
  if (Array.isArray(eff) && eff.length > 0) {
    return eff.map(normalizeMethodAdmissionProcessGroup);
  }
  const flat = cur.admissionSteps ?? cur.admission_steps;
  if (Array.isArray(flat) && flat.length > 0) {
    return [
      {
        methodCode: "",
        steps: flat.map((s, idx) => normalizeAdmissionProcessStep(s, idx)),
      },
    ];
  }
  return null;
}

/** PUT /campus/{id}/config — nếu BE trả envelope giống GET thì FE hydrate lại không cần GET. */
function campusConfigEnvelopeFromPutResponse(res) {
  const body = parseSchoolConfigResponseBody(res);
  if (!body || typeof body !== "object") return null;
  if (body.campusCurrent != null || body.campus_current != null) return body;
  return null;
}

function applyCampusCurrentFlatBookingScalars(cur, mergedOp) {
  if (!cur || typeof cur !== "object" || !mergedOp) return;
  const pick = (camel, snake) => {
    const raw = cur[camel] ?? cur[snake];
    if (raw == null || Number.isNaN(Number(raw))) return null;
    return Number(raw);
  };
  const mb = pick("maxBookingPerSlot", "max_booking_per_slot");
  if (mb != null) mergedOp.maxBookingPerSlot = mb;
  const mn = pick("minCounsellorPerSlot", "min_counsellor_per_slot");
  if (mn != null) mergedOp.minCounsellorPerSlot = mn;
  const mxTv = pick("maxCounsellorsPerSlot", "max_counsellors_per_slot");
  if (mxTv != null) mergedOp.maxCounsellorsPerSlot = mxTv;
  const sd = pick("slotDurationInMinutes", "slot_duration_in_minutes");
  if (sd != null) mergedOp.slotDurationInMinutes = sd;
  const ab = pick("allowBookingBeforeHours", "allow_booking_before_hours");
  if (ab != null) mergedOp.allowBookingBeforeHours = ab;
  const bf = pick("bufferBetweenSlotsMinutes", "buffer_between_slots_minutes");
  if (bf != null) mergedOp.bufferBetweenSlotsMinutes = bf;
}

/**
 * Phản hồi GET /api/v1/campus/config (campus theo phiên) — cả trụ sở và campus phụ.
 * CSVC + vận hành từ `campusCurrent.facilityJson` + merge HQ `hqDefault`.
 */
function normalizeFromCampusConfigApi(body) {
  const d = defaultConfig();
  const {hqDefault: hq, campusCurrent: cur} = pickCampusConfigGetEnvelope(body);
  const hqFac = hq.facility && typeof hq.facility === "object" ? hq.facility : {};
  const hqOp = hq.operation && typeof hq.operation === "object" ? hq.operation : {};
  const fj = parseBranchFacilityJson(cur.facilityJson ?? cur.facility_json);

  const hqImg = hqFac.imageData && typeof hqFac.imageData === "object" ? hqFac.imageData : {};

  /** Ảnh bìa từ facilityJson campus (ưu tiên `imageData.cover` theo contract GET) */
  function coverUrlFromFacilityJson(facilityJson) {
    if (!facilityJson || typeof facilityJson !== "object") return "";
    const img = facilityJson.imageData && typeof facilityJson.imageData === "object" ? facilityJson.imageData : {};
    if (img.cover != null && String(img.cover).trim() !== "") return String(img.cover);
    if (img.coverUrl != null && String(img.coverUrl).trim() !== "") return String(img.coverUrl);
    const ij = facilityJson.imageJsonData && typeof facilityJson.imageJsonData === "object" ? facilityJson.imageJsonData : {};
    if (ij.cover != null && String(ij.cover).trim() !== "") return String(ij.cover);
    return "";
  }

  let mergedFacility;
  if (fj && typeof fj === "object") {
    const fjImg = fj.imageData && typeof fj.imageData === "object" ? fj.imageData : {};
    const ij = fj.imageJsonData && typeof fj.imageJsonData === "object" ? fj.imageJsonData : {};
    const coverUrl =
      (ij.coverUrl != null && String(ij.coverUrl).trim() !== "" && String(ij.coverUrl).trim()) ||
      (ij.cover != null && String(ij.cover).trim() !== "" && String(ij.cover).trim()) ||
      coverUrlFromFacilityJson(fj) ||
      (fjImg.coverUrl != null && String(fjImg.coverUrl).trim() !== "" ? String(fjImg.coverUrl).trim() : "") ||
      (fjImg.cover != null && String(fjImg.cover).trim() !== "" ? String(fjImg.cover).trim() : "") ||
      "";
    const thumbnailUrl =
      ij.thumbnailUrl != null ? String(ij.thumbnailUrl) : fjImg.thumbnailUrl != null ? String(fjImg.thumbnailUrl) : "";
    const ijImageList = Array.isArray(ij.imageList) ? ij.imageList : [];
    const imageList =
      Array.isArray(fjImg.imageList) && fjImg.imageList.length > 0
        ? fjImg.imageList
        : ijImageList.length > 0
          ? ijImageList
          : galleryStringToImageList(ij.gallery ?? fjImg.gallery);
    mergedFacility = {
      itemList: Array.isArray(fj.itemList) ? fj.itemList : [],
      overview: fj.overview != null ? String(fj.overview) : "",
      imageData: {
        coverUrl,
        thumbnailUrl,
        imageList,
      },
    };
  } else {
    mergedFacility = {
      itemList: Array.isArray(hqFac.itemList) ? hqFac.itemList : [],
      overview: hqFac.overview != null ? String(hqFac.overview) : "",
      imageData: {
        coverUrl: hqImg.coverUrl != null ? String(hqImg.coverUrl) : "",
        thumbnailUrl: hqImg.thumbnailUrl != null ? String(hqImg.thumbnailUrl) : "",
        imageList: imageListFromFacilityImageBlock(hqImg),
      },
    };
  }

  const numHq = (v, fallback) =>
    v != null && !Number.isNaN(Number(v)) ? Number(v) : fallback;
  const mergedOp = {
    hotline: hqOp.hotline != null ? String(hqOp.hotline) : "",
    emailSupport: hqOp.emailSupport != null ? String(hqOp.emailSupport) : "",
    maxBookingPerSlot: numHq(hqOp.maxBookingPerSlot, d.operationSettingsData.maxBookingPerSlot),
    minCounsellorPerSlot: numHq(hqOp.minCounsellorPerSlot, d.operationSettingsData.minCounsellorPerSlot),
    maxCounsellorsPerSlot: numHq(hqOp.maxCounsellorsPerSlot, d.operationSettingsData.maxCounsellorsPerSlot),
    slotDurationInMinutes: numHq(hqOp.slotDurationInMinutes, d.operationSettingsData.slotDurationInMinutes),
    bufferBetweenSlotsMinutes: numHq(hqOp.bufferBetweenSlotsMinutes, d.operationSettingsData.bufferBetweenSlotsMinutes),
    allowBookingBeforeHours: numHq(hqOp.allowBookingBeforeHours, d.operationSettingsData.allowBookingBeforeHours),
    workingConfig: resolveSchoolWideWorkingConfigDisplay(hqOp, cur),
    methodAdmissionProcess: parseMethodAdmissionProcessFromOperation(hqOp),
  };

  const pdr = campusCurrentPolicyDetailRendered(cur);
  if (pdr) {
    if (pdr.maxBookingPerSlot != null && !Number.isNaN(Number(pdr.maxBookingPerSlot)))
      mergedOp.maxBookingPerSlot = Number(pdr.maxBookingPerSlot);
    if (pdr.minCounsellorPerSlot != null && !Number.isNaN(Number(pdr.minCounsellorPerSlot)))
      mergedOp.minCounsellorPerSlot = Number(pdr.minCounsellorPerSlot);
    if (pdr.maxCounsellorsPerSlot != null && !Number.isNaN(Number(pdr.maxCounsellorsPerSlot)))
      mergedOp.maxCounsellorsPerSlot = Number(pdr.maxCounsellorsPerSlot);
    if (pdr.slotDurationInMinutes != null && !Number.isNaN(Number(pdr.slotDurationInMinutes)))
      mergedOp.slotDurationInMinutes = Number(pdr.slotDurationInMinutes);
    if (pdr.bufferBetweenSlotsMinutes != null && !Number.isNaN(Number(pdr.bufferBetweenSlotsMinutes)))
      mergedOp.bufferBetweenSlotsMinutes = Number(pdr.bufferBetweenSlotsMinutes);
    if (pdr.allowBookingBeforeHours != null && !Number.isNaN(Number(pdr.allowBookingBeforeHours)))
      mergedOp.allowBookingBeforeHours = Number(pdr.allowBookingBeforeHours);
    if (pdr.hotline != null && String(pdr.hotline).trim() !== "") mergedOp.hotline = String(pdr.hotline);
    if (pdr.emailSupport != null && String(pdr.emailSupport).trim() !== "") mergedOp.emailSupport = String(pdr.emailSupport);
  }
  if (cur.hotline != null && String(cur.hotline).trim() !== "") mergedOp.hotline = String(cur.hotline);
  if (cur.emailSupport != null && String(cur.emailSupport).trim() !== "") mergedOp.emailSupport = String(cur.emailSupport);

  applyCampusCurrentFlatBookingScalars(cur, mergedOp);

  if (fj && typeof fj === "object") {
    if (fj.hotline != null) mergedOp.hotline = String(fj.hotline);
    if (fj.emailSupport != null) mergedOp.emailSupport = String(fj.emailSupport);
  }

  const effectiveAdmission = parseCampusCurrentEffectiveAdmissionProcesses(cur);
  if (effectiveAdmission != null) {
    mergedOp.methodAdmissionProcess = effectiveAdmission;
  } else if (fj && typeof fj === "object") {
    const hqHasAdmissionProcesses =
      Array.isArray(hqOp.admissionProcesses) && hqOp.admissionProcesses.length > 0;
    if (Array.isArray(fj.admissionStepsOverride) && !hqHasAdmissionProcesses) {
      const proc = [...(mergedOp.methodAdmissionProcess || [])];
      const first = proc[0] || {methodCode: "", steps: []};
      if (!first.methodCode || proc.length <= 1) {
        let steps = [...(first.steps || [])];
        fj.admissionStepsOverride.forEach((ov) => {
          const ord = Number(ov.stepOrder);
          const idx = steps.findIndex((s) => Number(s.stepOrder) === ord);
          if (idx >= 0) {
            steps[idx] = {...steps[idx], ...ov};
          } else {
            steps.push({
              stepName: ov.stepName != null ? String(ov.stepName) : "",
              stepOrder: ord,
              description: ov.description != null ? String(ov.description) : "",
            });
          }
        });
        steps = steps.sort((a, b) => Number(a.stepOrder) - Number(b.stepOrder));
        mergedOp.methodAdmissionProcess = [{...first, steps}];
      }
    }
  }

  return {
    ...d,
    facilityData: mergedFacility,
    operationSettingsData: mergedOp,
  };
}

/**
 * PUT /api/v1/campus/{campusId}/config — body phẳng partial (UpdateCampusConfigRequest).
 * BE merge partial; chỉ gửi field nhánh đã đổi (overview/itemList/imageJsonData/hotline/email/scalar/…).
 *
 * @param hqOperation — `hqDefault.operation` từ GET; dùng so sánh admissionStepsOverride
 */
function buildCampusFlatPutPayload(config, initial, hqOperation, initialPolicy, policy) {
  const fac = config.facilityData;
  const iFac = initial.facilityData;
  const op = config.operationSettingsData;
  const iOp = initial.operationSettingsData;
  const hqOp = hqOperation && typeof hqOperation === "object" ? hqOperation : {};

  const curFacPut = campusFacilityPutSlice(fac);
  const iniFacPut = campusFacilityPutSlice(iFac);
  const facilityDirty =
    curFacPut.overview !== iniFacPut.overview ||
    JSON.stringify(curFacPut.itemList) !== JSON.stringify(iniFacPut.itemList) ||
    JSON.stringify(curFacPut.imageJsonData) !== JSON.stringify(iniFacPut.imageJsonData);

  const policyDirty = (policy ?? "") !== (initialPolicy ?? "");

  const num0 = (v) => (v != null && !Number.isNaN(Number(v)) ? Number(v) : 0);
  const scalarsDirty =
    num0(op.maxBookingPerSlot) !== num0(iOp.maxBookingPerSlot) ||
    num0(op.minCounsellorPerSlot) !== num0(iOp.minCounsellorPerSlot) ||
    num0(op.maxCounsellorsPerSlot) !== num0(iOp.maxCounsellorsPerSlot) ||
    num0(op.slotDurationInMinutes) !== num0(iOp.slotDurationInMinutes) ||
    num0(op.bufferBetweenSlotsMinutes) !== num0(iOp.bufferBetweenSlotsMinutes) ||
    num0(op.allowBookingBeforeHours) !== num0(iOp.allowBookingBeforeHours);

  const hotlineDirty = String(op.hotline ?? "") !== String(iOp.hotline ?? "");
  const emailDirty = String(op.emailSupport ?? "") !== String(iOp.emailSupport ?? "");

  const admissionDirty =
    JSON.stringify(op.methodAdmissionProcess || []) !== JSON.stringify(iOp.methodAdmissionProcess || []);

  const anyDirty =
    facilityDirty || policyDirty || scalarsDirty || hotlineDirty || emailDirty || admissionDirty;
  if (!anyDirty) return {};

  const payload = {};

  if (facilityDirty) {
    payload.overview = curFacPut.overview;
    payload.itemList = curFacPut.itemList;
    payload.imageJsonData = curFacPut.imageJsonData;
  }

  if (hotlineDirty) {
    payload.hotline = op.hotline ?? "";
  }
  if (emailDirty) {
    payload.emailSupport = op.emailSupport ?? "";
  }

  if (scalarsDirty) {
    if (num0(op.maxBookingPerSlot) !== num0(iOp.maxBookingPerSlot))
      payload.maxBookingPerSlot = num0(op.maxBookingPerSlot);
    if (num0(op.minCounsellorPerSlot) !== num0(iOp.minCounsellorPerSlot))
      payload.minCounsellorPerSlot = num0(op.minCounsellorPerSlot);
    if (num0(op.maxCounsellorsPerSlot) !== num0(iOp.maxCounsellorsPerSlot))
      payload.maxCounsellorsPerSlot = num0(op.maxCounsellorsPerSlot);
    if (num0(op.slotDurationInMinutes) !== num0(iOp.slotDurationInMinutes))
      payload.slotDurationInMinutes = num0(op.slotDurationInMinutes);
    if (num0(op.bufferBetweenSlotsMinutes) !== num0(iOp.bufferBetweenSlotsMinutes))
      payload.bufferBetweenSlotsMinutes = num0(op.bufferBetweenSlotsMinutes);
    if (num0(op.allowBookingBeforeHours) !== num0(iOp.allowBookingBeforeHours))
      payload.allowBookingBeforeHours = num0(op.allowBookingBeforeHours);
  }

  if (admissionDirty) {
    const hqHasAdmissionProcesses =
      Array.isArray(hqOp.admissionProcesses) && hqOp.admissionProcesses.length > 0;
    const hqProc = parseMethodAdmissionProcessFromOperation(hqOp);
    const curProc = op.methodAdmissionProcess || [];
    const admissionStepsOverride = [];
    if (!hqHasAdmissionProcesses) {
      const hqSteps =
        hqProc.length === 1 && !String(hqProc[0]?.methodCode ?? "").trim()
          ? hqProc[0].steps || []
          : Array.isArray(hqOp.admissionSteps)
            ? hqOp.admissionSteps
            : [];
      const curSteps =
        curProc.length === 1 && !String(curProc[0]?.methodCode ?? "").trim() ? curProc[0].steps || [] : [];
      curSteps.forEach((step, idx) => {
        const ord = Number(step.stepOrder) || idx + 1;
        const hqS = hqSteps.find((s) => Number(s.stepOrder) === ord);
        const desc = step.description ?? "";
        const hqDesc = hqS?.description ?? "";
        if (desc !== hqDesc) admissionStepsOverride.push({stepOrder: ord, description: desc});
      });
    }
    if (admissionStepsOverride.length > 0) payload.admissionStepsOverride = admissionStepsOverride;
  }

  if (policyDirty) {
    payload.policyDetail = policy ?? "";
  }

  if (Object.keys(payload).length === 0 && anyDirty) {
    return buildCampusFlatPutPayloadFallbackFull(config, hqOperation, policy);
  }

  return payload;
}

/** Gửi đủ nhánh PUT như phiên bản cũ — chỉ khi partial không map được thay đổi (hiếm). */
function buildCampusFlatPutPayloadFallbackFull(config, hqOperation, policy) {
  const fac = config.facilityData;
  const op = config.operationSettingsData;
  const hqOp = hqOperation && typeof hqOperation === "object" ? hqOperation : {};
  const curFacPut = campusFacilityPutSlice(fac);
  const payload = {
    overview: curFacPut.overview,
    itemList: curFacPut.itemList,
    imageJsonData: curFacPut.imageJsonData,
    hotline: op.hotline ?? "",
    emailSupport: op.emailSupport ?? "",
    maxBookingPerSlot: Number(op.maxBookingPerSlot) || 0,
    minCounsellorPerSlot: Number(op.minCounsellorPerSlot) || 0,
    maxCounsellorsPerSlot: Number(op.maxCounsellorsPerSlot) || 0,
    slotDurationInMinutes: Number(op.slotDurationInMinutes) || 0,
    bufferBetweenSlotsMinutes: Number(op.bufferBetweenSlotsMinutes) || 0,
    allowBookingBeforeHours: Number(op.allowBookingBeforeHours) || 0,
    policyDetail: policy ?? "",
  };
  const hqHasAdmissionProcesses =
    Array.isArray(hqOp.admissionProcesses) && hqOp.admissionProcesses.length > 0;
  const hqProc = parseMethodAdmissionProcessFromOperation(hqOp);
  const curProc = op.methodAdmissionProcess || [];
  const admissionStepsOverride = [];
  if (!hqHasAdmissionProcesses) {
    const hqSteps =
      hqProc.length === 1 && !String(hqProc[0]?.methodCode ?? "").trim()
        ? hqProc[0].steps || []
        : Array.isArray(hqOp.admissionSteps)
          ? hqOp.admissionSteps
          : [];
    const curSteps =
      curProc.length === 1 && !String(curProc[0]?.methodCode ?? "").trim() ? curProc[0].steps || [] : [];
    curSteps.forEach((step, idx) => {
      const ord = Number(step.stepOrder) || idx + 1;
      const hqS = hqSteps.find((s) => Number(s.stepOrder) === ord);
      const desc = step.description ?? "";
      const hqDesc = hqS?.description ?? "";
      if (desc !== hqDesc) admissionStepsOverride.push({stepOrder: ord, description: desc});
    });
  }
  if (admissionStepsOverride.length > 0) payload.admissionStepsOverride = admissionStepsOverride;
  return payload;
}

const ADMISSION_METHOD_DETAIL_SKIP = new Set(["code", "displayName", "description", "__isNewRow"]);

function admissionMethodExtraEntries(m) {
  if (!m || typeof m !== "object") return [];
  return Object.entries(m).filter(([k]) => !ADMISSION_METHOD_DETAIL_SKIP.has(k));
}

/**
 * @param {{ variant?: "platform" | "campus" }} props
 * - platform: GET/PUT /school/config/{schoolId} (chỉ campus chính / isPrimaryBranch)
 * - campus: GET /campus/config; PUT /campus/{campusId}/config — campus phụ: cơ sở đăng nhập; campus chính: chỉ cơ sở chính (không chọn campus khác).
 */
export default function SchoolConfig({variant = "platform"} = {}) {
  const {isPrimaryBranch, currentCampusId, loading: schoolCtxLoading} = useSchool();
  /** Cơ sở phụ: luôn dùng GET/PUT campus; hoặc ép `variant="campus"` (vd. bọc từ route). */
  const isCampusVariant = variant === "campus" || !isPrimaryBranch;
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();
  /** Chỉ dùng khi campus chính + variant campus — id cơ sở chính sau listCampuses. */
  const [primaryCampusResolvedId, setPrimaryCampusResolvedId] = useState(null);

  const effectiveCampusId = useMemo(() => {
    if (!isCampusVariant) return null;
    if (!isPrimaryBranch) return currentCampusId;
    return primaryCampusResolvedId;
  }, [isCampusVariant, isPrimaryBranch, currentCampusId, primaryCampusResolvedId]);

  const useCampusConfigFlow = Boolean(isCampusVariant && effectiveCampusId != null);

  const tabSlugs = isCampusVariant ? BRANCH_TAB_SLUGS : TAB_SLUGS;
  const tabLabels = isCampusVariant ? BRANCH_TAB_LABELS : TAB_LABELS;
  const tabSlug = searchParams.get("tab") || (isCampusVariant ? "operation" : "admission");
  const tabIndex = tabSlugs.includes(tabSlug) ? tabSlugs.indexOf(tabSlug) : 0;

  useEffect(() => {
    if (!isCampusVariant && searchParams.get("tab") === "holiday") {
      navigate("/school/holiday-settings", {replace: true});
    }
  }, [isCampusVariant, navigate, searchParams]);

  const setTabIndex = useCallback(
    (idx) => {
      const slug = tabSlugs[idx] || tabSlugs[0] || "admission";
      setSearchParams({tab: slug}, {replace: true});
    },
    [setSearchParams, tabSlugs]
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [schoolId, setSchoolId] = useState(null);
  /** Danh sách cơ sở (platform): chọn campusId trong tab Phân bổ nguồn lực — đồng bộ GET/PUT /school/config/{schoolId}. */
  const [campusList, setCampusList] = useState([]);
  const [branchPolicyDetail, setBranchPolicyDetail] = useState("");
  /** policyDetailRendered.fullTextRendered — chỉ đọc từ GET, cập nhật sau mỗi lần load. */
  const [branchPolicyFullTextRendered, setBranchPolicyFullTextRendered] = useState("");
  const [campusHqOperationMissing, setCampusHqOperationMissing] = useState(false);
  const [branchHqOperation, setBranchHqOperation] = useState({});
  const branchHqOperationRef = useRef(null);
  const initialPolicyRef = useRef("");
  const initialPolicyFullTextRef = useRef("");
  const [config, setConfig] = useState(() => defaultConfig());
  const initialRef = useRef(null);
  const facilityFormRef = useRef(null);
  const methodAdmissionProcessGroupRefs = useRef({});
  const mandatoryDocsImportInputRef = useRef(null);
  const mandatoryImportValidateTimersRef = useRef({});
  const mandatoryImportValidateSeqRef = useRef({});
  const [pendingScrollToProcessIdx, setPendingScrollToProcessIdx] = useState(null);
  const [lastLoadedAt, setLastLoadedAt] = useState(null);
  const [admissionMethodExpanded, setAdmissionMethodExpanded] = useState({});
  /** Chuỗi JSON so sánh với mẫu GET system (badge). */
  const [systemAdmissionComparable, setSystemAdmissionComparable] = useState("");
  const [admissionViewMode] = useState("edit");
  const [admissionRestoreConfirmOpen, setAdmissionRestoreConfirmOpen] = useState(false);
  const [restoreTemplateTarget, setRestoreTemplateTarget] = useState("admission");
  const [admissionToggleOffConfirm, setAdmissionToggleOffConfirm] = useState({open: false, code: ""});
  const [admissionRemoveRowConfirm, setAdmissionRemoveRowConfirm] = useState({open: false, idx: -1});
  const [loadingSystemAdmission, setLoadingSystemAdmission] = useState(false);
  const [resourceSummaryReport, setResourceSummaryReport] = useState(null);
  const [resourceSummaryLoading, setResourceSummaryLoading] = useState(false);
  const [mandatoryImportDialogOpen, setMandatoryImportDialogOpen] = useState(false);
  const [mandatoryImportLoading, setMandatoryImportLoading] = useState(false);
  const [mandatoryImportConfirming, setMandatoryImportConfirming] = useState(false);
  const [mandatoryImportRows, setMandatoryImportRows] = useState([]);
  /** Pattern A: bật mới hiện form HK; tắt = không giới hạn (xóa ngày trong form). Đồng bộ sau load. */
  const [academicSemesterLimitEnabled, setAcademicSemesterLimitEnabled] = useState(false);

  const toggleAdmissionMethodExpand = useCallback((key) => {
    setAdmissionMethodExpanded((p) => ({...p, [key]: !p[key]}));
  }, []);

  const methodCatalog = useMemo(
    () =>
      mergeAdmissionMethodCatalogRows(
        config.admissionSettingsData?.availableMethods,
        config.admissionSettingsData?.allowedMethods
      ),
    [config.admissionSettingsData?.availableMethods, config.admissionSettingsData?.allowedMethods]
  );

  /** Tab Hồ sơ — nhóm theo phương thức: chỉ chọn methodCode từ allowedMethods (Cài đặt Tuyển sinh). */
  const allowedMethodsDocumentDropdown = useMemo(
    () =>
      (config.admissionSettingsData?.allowedMethods || [])
        .map((m) => {
          const value = String(m?.code ?? "").trim();
          if (!value) return null;
          const display = String(m?.displayName ?? "").trim() || value;
          return {value, label: `${display} (${value})`};
        })
        .filter(Boolean),
    [config.admissionSettingsData?.allowedMethods]
  );

  /** Mã phương thức gợi ý: đã bật tuyển sinh + nhóm hồ sơ theo phương thức + đang cấu hình quy trình */
  const admissionMethodCodeOptions = useMemo(() => {
    const codes = new Map();
    (config.admissionSettingsData?.allowedMethods || []).forEach((m) => {
      const c = String(m?.code ?? "").trim();
      if (c) codes.set(c, String(m?.displayName ?? m?.code ?? c).trim() || c);
    });
    (config.documentRequirementsData?.byMethod || []).forEach((g) => {
      const c = String(g?.methodCode ?? "").trim();
      if (c && !codes.has(c)) codes.set(c, c);
    });
    (config.admissionSettingsData?.methodAdmissionProcess || []).forEach((g) => {
      const c = String(g?.methodCode ?? "").trim();
      if (c && !codes.has(c)) codes.set(c, c);
    });
    return Array.from(codes.entries())
      .map(([value, label]) => ({value, label}))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [
    config.admissionSettingsData?.allowedMethods,
    config.documentRequirementsData?.byMethod,
    config.admissionSettingsData?.methodAdmissionProcess,
  ]);

  useEffect(() => () => {
    Object.values(mandatoryImportValidateTimersRef.current).forEach((timerId) => window.clearTimeout(timerId));
    mandatoryImportValidateTimersRef.current = {};
  }, []);

  const mandatoryImportErrorCount = useMemo(
    () => (mandatoryImportRows || []).reduce((total, row) => total + (row?.isError ? 1 : 0), 0),
    [mandatoryImportRows]
  );
  const mandatoryImportValidatingCount = useMemo(
    () => (mandatoryImportRows || []).reduce((total, row) => total + (row?._isValidating ? 1 : 0), 0),
    [mandatoryImportRows]
  );
  const mandatoryImportHasAnyError = mandatoryImportErrorCount > 0 || mandatoryImportValidatingCount > 0;

  const schoolAdmissionComparable = useMemo(
    () => admissionSettingsComparableJson(config.admissionSettingsData),
    [config.admissionSettingsData]
  );

  const admissionTemplateBadge = useMemo(() => {
    if (!systemAdmissionComparable) {
      return {label: "Chưa tải mẫu hệ thống", color: "default"};
    }
    if (schoolAdmissionComparable === systemAdmissionComparable) {
      return {label: "Khớp mẫu hệ thống", color: "info"};
    }
    return {label: "Đã tùy chỉnh so với mẫu", color: "primary"};
  }, [schoolAdmissionComparable, systemAdmissionComparable]);

  const snapshot = useMemo(() => JSON.stringify(config), [config]);
  const isDirty = useMemo(() => {
    const init = initialRef.current;
    if (!init) return false;
    const cfgDirty = snapshot !== JSON.stringify(init);
    const polDirty = branchPolicyDetail !== (initialPolicyRef.current ?? "");
    return cfgDirty || polDirty;
  }, [snapshot, branchPolicyDetail]);

  /** Khi không chỉnh sửa hoặc đang lưu: khoá nhập nhưng giữ màu bình thường (readOnly / chặn pointer, không dùng disabled). */
  const fieldDisabled = saving || !editing;
  const blockPointerSx = fieldDisabled ? { pointerEvents: "none", cursor: "default" } : undefined;
  const admissionFormBlocked = fieldDisabled || admissionViewMode === "preview";
  const admissionBlockPointerSx = admissionFormBlocked ? {pointerEvents: "none", cursor: "default"} : undefined;

  const load = useCallback(async (opts = {}) => {
    const silent = opts.silent === true;
    try {
      if (!silent) setLoading(true);
      const resCampuses = await listCampuses();
      const campuses = extractCampusListBody(resCampuses);
      setCampusList(Array.isArray(campuses) ? campuses : []);

      if (isCampusVariant) {
        let cid = null;
        if (isPrimaryBranch) {
          cid = pickPrimaryCampusIdFromCampuses(campuses);
          setPrimaryCampusResolvedId(cid);
          if (cid == null) {
            enqueueSnackbar("Không xác định được cơ sở chính để tải cấu hình.", {variant: "error"});
            const empty = defaultConfig();
            setConfig(empty);
            initialRef.current = JSON.parse(JSON.stringify(empty));
            setBranchPolicyDetail("");
            initialPolicyRef.current = "";
            setBranchPolicyFullTextRendered("");
            initialPolicyFullTextRef.current = "";
            branchHqOperationRef.current = {};
            setBranchHqOperation({});
            setCampusHqOperationMissing(false);
            setSchoolId(pickSchoolIdFromCampuses(campuses));
            setLastLoadedAt(new Date());
            return;
          }
        } else {
          setPrimaryCampusResolvedId(null);
          cid = currentCampusId;
          if (cid == null) {
            enqueueSnackbar("Không xác định được cơ sở đăng nhập.", {variant: "error"});
            const empty = defaultConfig();
            setConfig(empty);
            initialRef.current = JSON.parse(JSON.stringify(empty));
            setBranchPolicyDetail("");
            initialPolicyRef.current = "";
            setBranchPolicyFullTextRendered("");
            initialPolicyFullTextRef.current = "";
            branchHqOperationRef.current = {};
            setBranchHqOperation({});
            setCampusHqOperationMissing(false);
            setSchoolId(pickSchoolIdFromCampuses(campuses));
            setLastLoadedAt(new Date());
            return;
          }
        }

        const cfgRes = await getCampusConfig();
        if (cfgRes?.status != null && (cfgRes.status < 200 || cfgRes.status >= 300)) {
          throw new Error(cfgRes?.data?.message || "Yêu cầu thất bại");
        }
        const envelope = parseSchoolConfigResponseBody(cfgRes);
        const {hqDefault, campusCurrent} = pickCampusConfigGetEnvelope(envelope);
        const hqOpRaw = hqDefault?.operation;
        setCampusHqOperationMissing(
          !hqOpRaw || typeof hqOpRaw !== "object" || Object.keys(hqOpRaw).length === 0
        );
        branchHqOperationRef.current = hqDefault?.operation
          ? JSON.parse(JSON.stringify(hqDefault.operation))
          : {};
        const pol = policyFromCampusCurrent(campusCurrent);
        setBranchPolicyDetail(pol);
        initialPolicyRef.current = pol;
        const fullText = policyFullTextRenderedFromCampusCurrent(campusCurrent);
        setBranchPolicyFullTextRendered(fullText);
        initialPolicyFullTextRef.current = fullText;
        const next = normalizeFromCampusConfigApi(envelope);
        setSchoolId(pickSchoolIdFromCampuses(campuses));
        setConfig(next);
        initialRef.current = JSON.parse(JSON.stringify(next));
        setLastLoadedAt(new Date());
        return;
      }

      const sid = pickSchoolIdFromCampuses(campuses);
      if (sid == null) {
        enqueueSnackbar("Không lấy được schoolId", {variant: "error"});
        return;
      }
      setSchoolId(sid);

      /** Cơ sở chính (isPrimaryBranch): GET /api/v1/school/config/{schoolId} — toàn bộ form. */
      setBranchPolicyDetail("");
      initialPolicyRef.current = "";
      setBranchPolicyFullTextRendered("");
      initialPolicyFullTextRef.current = "";
      branchHqOperationRef.current = {};
      setBranchHqOperation({});

      let next;
      try {
        const schoolRes = await getSchoolConfig(sid);
        if (schoolRes?.status != null && (schoolRes.status < 200 || schoolRes.status >= 300)) {
          throw new Error(schoolRes?.data?.message || "Yêu cầu thất bại");
        }
        const schoolBody = parseSchoolConfigResponseBody(schoolRes);
        next = normalizeFromApi(schoolBody);
      } catch (e) {
        console.error(e);
        enqueueSnackbar(
          e?.response?.data?.message || e?.message || "Không tải được cấu hình trường (GET /school/config).",
          {variant: "error"}
        );
        next = defaultConfig();
      }

      const qa = next.quotaConfigData?.campusAssignments;
      const mergedQuota = mergeQuotaRows(campuses, qa);
      if (mergedQuota.length > 0) {
        next = {
          ...next,
          quotaConfigData: {
            ...next.quotaConfigData,
            campusAssignments: mergedQuota,
          },
        };
      } else if (Array.isArray(qa) && qa.length > 0) {
        next = {
          ...next,
          quotaConfigData: {
            ...next.quotaConfigData,
            campusAssignments: qa,
          },
        };
      }

      setConfig(next);
      initialRef.current = JSON.parse(JSON.stringify(next));
      setLastLoadedAt(new Date());
    } catch (e) {
      console.error(e);
      enqueueSnackbar(
        useCampusConfigFlow || isCampusVariant ? "Không thể tải cấu hình cơ sở" : "Không thể tải cấu hình trường",
        {variant: "error"}
      );
    } finally {
      if (!silent) setLoading(false);
    }
  }, [isCampusVariant, isPrimaryBranch, currentCampusId]);

  useEffect(() => {
    if (schoolCtxLoading) return;
    load();
  }, [load, schoolCtxLoading]);

  useEffect(() => {
    if (pendingScrollToProcessIdx == null) return;
    const id = requestAnimationFrame(() => {
      const el = methodAdmissionProcessGroupRefs.current[pendingScrollToProcessIdx];
      if (el?.scrollIntoView) {
        el.scrollIntoView({behavior: "smooth", block: "start", inline: "nearest"});
      }
      setPendingScrollToProcessIdx(null);
    });
    return () => cancelAnimationFrame(id);
  }, [pendingScrollToProcessIdx]);

  useEffect(() => {
    if (isCampusVariant || schoolId == null) return;
    let cancelled = false;
    (async () => {
      try {
        const tmpl = await fetchSystemAdmissionSettingsData();
        if (cancelled) return;
        if (tmpl && typeof tmpl === "object") {
          setSystemAdmissionComparable(admissionSettingsComparableJson(tmpl));
        } else {
          setSystemAdmissionComparable("");
        }
      } catch {
        if (!cancelled) setSystemAdmissionComparable("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isCampusVariant, schoolId, lastLoadedAt]);

  useEffect(() => {
    if (isCampusVariant || tabSlug !== "quota") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await getSystemConfigByKey("admissionQuota");
        if (cancelled) return;
        const body = res?.data?.body ?? res?.data?.data ?? res?.data ?? {};
        const quotaRoot = body?.admissionQuota && typeof body.admissionQuota === "object" ? body.admissionQuota : body;
        const year = String(quotaRoot?.source?.year ?? "").trim();
        const quotas = Array.isArray(quotaRoot?.quotas) ? quotaRoot.quotas : [];
        const sidNum = Number(schoolId);
        const matched =
          quotas.find((q) => Number(q?.schoolId) === sidNum) ??
          quotas.find((q) => q?.value != null) ??
          null;
        const totalSystemQuota = matched != null ? Number(matched.value) || 0 : 0;
        setConfig((prev) => ({
          ...prev,
          quotaConfigData: {
            ...prev.quotaConfigData,
            academicYear: year || prev.quotaConfigData.academicYear || "",
            totalSystemQuota,
          },
        }));
      } catch {
        // ignore, giữ dữ liệu hiện tại nếu API system không khả dụng
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isCampusVariant, tabSlug, schoolId, lastLoadedAt]);

  useEffect(() => {
    if (isCampusVariant || tabSlug !== "resource-distribution") return;
    let cancelled = false;
    setResourceSummaryLoading(true);
    getCurrentSchoolSubscription()
      .then((res) => {
        if (cancelled) return;
        const body = res?.data?.body ?? res?.data ?? {};
        const rs = body?.resourceSummary && typeof body.resourceSummary === "object" ? body.resourceSummary : null;
        setResourceSummaryReport(
          rs
            ? {
                totalPackageQuota: Number(rs.totalPackageQuota) || 0,
                myCampusQuota: Number(rs.myCampusQuota) || 0,
                otherCampusesQuota: Number(rs.otherCampusesQuota) || 0,
              }
            : null
        );
      })
      .catch(() => {
        if (cancelled) return;
        setResourceSummaryReport(null);
      })
      .finally(() => {
        if (!cancelled) setResourceSummaryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isCampusVariant, tabSlug, lastLoadedAt]);

  useEffect(() => {
    if (isCampusVariant) return;
    const cal = config.operationSettingsData?.academicCalendar;
    const n = normalizeAcademicCalendar(cal);
    setAcademicSemesterLimitEnabled(isAcademicCalendarLimitActive(n));
  }, [lastLoadedAt, isCampusVariant]);

  const handleReset = useCallback(() => {
    const init = initialRef.current;
    if (!init) return;
    setConfig(JSON.parse(JSON.stringify(init)));
    setBranchPolicyDetail(initialPolicyRef.current ?? "");
    setBranchPolicyFullTextRendered(initialPolicyFullTextRef.current ?? "");
    if (!isCampusVariant) {
      const n = normalizeAcademicCalendar(init.operationSettingsData?.academicCalendar);
      setAcademicSemesterLimitEnabled(isAcademicCalendarLimitActive(n));
    }
    setEditing(false);
    enqueueSnackbar("Đã huỷ thay đổi", {variant: "info"});
  }, [isCampusVariant]);

  const handleSave = useCallback(async () => {
    if (!editing) return;
    if (!useCampusConfigFlow && schoolId == null) return;
    if (useCampusConfigFlow && effectiveCampusId == null) return;
    const initial = initialRef.current;
    if (!initial) return;

    if (useCampusConfigFlow && effectiveCampusId != null) {
      const payload = buildCampusFlatPutPayload(
        config,
        initial,
        branchHqOperationRef.current,
        initialPolicyRef.current,
        branchPolicyDetail
      );
      if (Object.keys(payload).length === 0) {
        enqueueSnackbar("Không có thay đổi để lưu", {variant: "info"});
        return;
      }
      if (payload.overview != null || payload.itemList != null || payload.imageJsonData != null) {
        const ok = facilityFormRef.current?.validate?.() ?? true;
        if (!ok) {
          enqueueSnackbar("Vui lòng kiểm tra lại tab Cơ sở vật chất", {variant: "error"});
          setTabIndex(useCampusConfigFlow ? 1 : 5);
          return;
        }
      }
      setSaving(true);
      try {
        const res = await updateCampusConfig(effectiveCampusId, payload);
        if (res?.status >= 200 && res?.status < 300) {
          enqueueSnackbar(campusConfigSaveSuccessMessage(res?.data?.message), {variant: "success"});
          setEditing(false);
          const putEnv = campusConfigEnvelopeFromPutResponse(res);
          if (putEnv) {
            const {hqDefault, campusCurrent} = pickCampusConfigGetEnvelope(putEnv);
            const hqOpPut = hqDefault?.operation;
            setCampusHqOperationMissing(
              !hqOpPut || typeof hqOpPut !== "object" || Object.keys(hqOpPut).length === 0
            );
            if (hqDefault?.operation && typeof hqDefault.operation === "object") {
              branchHqOperationRef.current = JSON.parse(JSON.stringify(hqDefault.operation));
              setBranchHqOperation(branchHqOperationRef.current);
            }
            const pol = policyFromCampusCurrent(campusCurrent);
            setBranchPolicyDetail(pol);
            initialPolicyRef.current = pol;
            const fullText = policyFullTextRenderedFromCampusCurrent(campusCurrent);
            setBranchPolicyFullTextRendered(fullText);
            initialPolicyFullTextRef.current = fullText;
            const next = normalizeFromCampusConfigApi(putEnv);
            setConfig(next);
            initialRef.current = JSON.parse(JSON.stringify(next));
            setLastLoadedAt(new Date());
          } else {
            await load({silent: true});
          }
        } else {
          enqueueSnackbar(res?.data?.message || "Có lỗi khi lưu", {variant: "error"});
        }
      } catch (e) {
        console.error(e);
        enqueueSnackbar("Không thể lưu cấu hình cơ sở", {variant: "error"});
      } finally {
        setSaving(false);
      }
      return;
    }

    /** Cơ sở chính: PUT /api/v1/school/config/{schoolId} (gồm operationSettingsData + facilityData nếu đổi). */
    const schoolPayloadRaw = buildPartialPayload(config, initial);
    const allowedSectionKeys = new Set(getSectionKeysByTabSlug(tabSlug));
    const schoolPayload = Object.fromEntries(
      Object.entries(schoolPayloadRaw).filter(([key]) => allowedSectionKeys.has(key))
    );

    if (Object.keys(schoolPayload).length === 0) {
      enqueueSnackbar("Không có thay đổi để lưu", {variant: "info"});
      return;
    }

    if (schoolPayload.facilityData != null) {
      const ok = facilityFormRef.current?.validate?.() ?? true;
      if (!ok) {
        enqueueSnackbar("Vui lòng kiểm tra lại tab Cơ sở vật chất", {variant: "error"});
        setTabIndex(5);
        return;
      }
    }

    const minP = Number(config.financePolicyData?.priceAdjustment?.minPercent ?? 0);
    const maxP = Number(config.financePolicyData?.priceAdjustment?.maxPercent ?? 0);
    if (schoolPayload.financePolicyData?.priceAdjustment != null && minP >= maxP) {
      enqueueSnackbar("% tối thiểu phải nhỏ hơn % tối đa", {variant: "error"});
      setTabIndex(2);
      return;
    }

    const pct = Number(config.admissionSettingsData?.quotaAlertThresholdPercent ?? 0);
    if (schoolPayload.admissionSettingsData && (pct < 0 || pct > 100)) {
      enqueueSnackbar("Ngưỡng cảnh báo phải từ 0 đến 100", {variant: "error"});
      setTabIndex(0);
      return;
    }

    if (schoolPayload.resourceDistributionData != null) {
      const rows = config.resourceDistributionData?.allocations || [];
      const incomplete = rows.some((r) => {
        const hasAny =
          (r?.resourceType != null && String(r.resourceType).trim() !== "") ||
          r?.campusId != null ||
          (r?.allocatedAmount != null && Number(r.allocatedAmount) !== 0);
        if (!hasAny) return false;
        const rt = canonicalResourceType(r?.resourceType != null ? String(r.resourceType) : "");
        const cid = r?.campusId;
        return !isKnownResourceTypeValue(rt) || cid == null || Number.isNaN(Number(cid));
      });
      if (incomplete) {
        enqueueSnackbar("Phân bổ nguồn lực: mỗi dòng đã nhập cần có loại nguồn lực và cơ sở hợp lệ.", {variant: "error"});
        setTabIndex(6);
        return;
      }
    }

    const feeListAll = config.financePolicyData?.feeItems || [];
    const feeCodedRows = feeItemsWithCodes(feeListAll);
    const feeCodes = feeCodedRows.map((r) => String(r.feeCode).trim());
    if (feeCodes.length !== new Set(feeCodes).size) {
      enqueueSnackbar("Mã phí (feeCode) không được trùng nhau.", {variant: "error"});
      setTabIndex(2);
      return;
    }
    const feeRowMissingCode = feeListAll.some((r) => {
      if (!r || typeof r !== "object") return false;
      const code = String(r.feeCode ?? "").trim();
      const hasData =
        String(r.feeName ?? "").trim() !== "" ||
        (r.amount != null && Number(r.amount) !== 0) ||
        String(r.description ?? "").trim() !== "" ||
        Boolean(r.isMandatory) ||
        Boolean(r.isReservationFee);
      return hasData && !code;
    });
    if (feeRowMissingCode) {
      enqueueSnackbar("Mỗi khoản phí đã nhập dữ liệu cần có mã (feeCode).", {variant: "error"});
      setTabIndex(2);
      return;
    }

    const shiftValidation = validateOperationSettingsWorkShifts(config.operationSettingsData);
    if (!shiftValidation.ok) {
      enqueueSnackbar(shiftValidation.message || "Ca làm việc không hợp lệ (loại ca + khung giờ theo quy định).", {
        variant: "error",
      });
      setTabIndex(2);
      return;
    }

    const acCalSave = normalizeAcademicCalendar(config.operationSettingsData.academicCalendar);
    const acRes = validateAcademicCalendarForSave(academicSemesterLimitEnabled, acCalSave);
    if (!acRes.ok) {
      enqueueSnackbar(acRes.message, {variant: "warning"});
      setTabIndex(2);
      return;
    }

    setSaving(true);
    try {
      const resSchool = await updateSchoolConfig(schoolId, schoolPayload);
      if (resSchool?.status < 200 || resSchool?.status >= 300) {
        enqueueSnackbar(resSchool?.data?.message || "Có lỗi khi lưu cấu hình trường", {variant: "error"});
        await load({silent: true});
        return;
      }
      enqueueSnackbar(schoolConfigSaveSuccessMessage(resSchool?.data?.message), {variant: "success"});
      if (schoolPayload.admissionSettingsData != null) {
        enqueueSnackbar("Nếu đổi phương thức, nên kiểm tra lại yêu cầu hồ sơ theo phương thức.", {
          variant: "info",
          action: (key) => (
            <Button
              color="inherit"
              size="small"
              sx={{fontWeight: 700}}
              onClick={() => {
                closeSnackbar(key);
                setSearchParams({tab: "documents"}, {replace: true});
              }}
            >
              Mở Cài đặt hồ sơ
            </Button>
          ),
        });
      }
      setEditing(false);
      await load({silent: true});
    } catch (e) {
      console.error(e);
      enqueueSnackbar("Không thể lưu cấu hình", {variant: "error"});
    } finally {
      setSaving(false);
    }
  }, [
    config,
    schoolId,
    useCampusConfigFlow,
    effectiveCampusId,
    tabSlug,
    branchPolicyDetail,
    setTabIndex,
    setSearchParams,
    editing,
    load,
    academicSemesterLimitEnabled,
  ]);

  const allocatedTotal = useMemo(() => {
    return (config.quotaConfigData?.campusAssignments || []).reduce((s, r) => s + Number(r.allocatedQuota || 0), 0);
  }, [config.quotaConfigData?.campusAssignments]);

  const systemQuota = Number(config.quotaConfigData?.totalSystemQuota || 0);
  const quotaMismatch = systemQuota > 0 && allocatedTotal !== systemQuota;

  const applySystemTemplateToForm = useCallback(async () => {
    setLoadingSystemAdmission(true);
    try {
      const tmpl = await fetchSystemAdmissionSettingsData();
      if (!tmpl || typeof tmpl !== "object") {
        enqueueSnackbar("Không có mẫu phương thức trên hệ thống.", {variant: "info"});
        return;
      }
      const am = Array.isArray(tmpl.allowedMethods) ? tmpl.allowedMethods : [];
      const processesRaw = Array.isArray(tmpl.methodAdmissionProcess)
        ? tmpl.methodAdmissionProcess
        : Array.isArray(tmpl.admissionProcesses)
          ? tmpl.admissionProcesses
          : [];
      const processGroups = processesRaw.some((item) => Array.isArray(item?.steps))
        ? processesRaw.map(normalizeMethodAdmissionProcessGroup)
        : groupFlatAdmissionProcesses(processesRaw);
      const mapped = am.map((m) => ({
        code: m?.code != null ? String(m.code) : "",
        displayName: m?.displayName != null ? String(m.displayName) : "",
        description: m?.description != null ? String(m.description) : "",
      }));
      setConfig((c) => ({
        ...c,
        admissionSettingsData: {
          ...c.admissionSettingsData,
          availableMethods: mapped.map((x) => ({...x})),
          allowedMethods: mapped.map((x) => ({...x})),
          methodAdmissionProcess: processGroups,
          autoCloseOnFull: typeof tmpl.autoCloseOnFull === "boolean" ? tmpl.autoCloseOnFull : true,
          quotaAlertThresholdPercent:
            tmpl.quotaAlertThresholdPercent != null && !Number.isNaN(Number(tmpl.quotaAlertThresholdPercent))
              ? Number(tmpl.quotaAlertThresholdPercent)
              : 90,
        },
      }));
      enqueueSnackbar("Đã áp dụng mẫu hệ thống vào form (chưa lưu DB).", {variant: "success"});
    } finally {
      setLoadingSystemAdmission(false);
    }
  }, []);

  const applySystemDocumentTemplateToForm = useCallback(async () => {
    setLoadingSystemAdmission(true);
    try {
      const tmpl = await fetchSystemAdmissionSettingsData();
      if (!tmpl || typeof tmpl !== "object") {
        enqueueSnackbar("Không có mẫu hồ sơ trên hệ thống.", {variant: "info"});
        return;
      }
      const docRoot = tmpl.documentRequirementsData && typeof tmpl.documentRequirementsData === "object" ? tmpl.documentRequirementsData : {};
      const byMethodRaw = Array.isArray(docRoot.byMethod)
        ? docRoot.byMethod
        : Array.isArray(tmpl.methodDocumentRequirements)
          ? tmpl.methodDocumentRequirements
          : Array.isArray(tmpl.byMethod)
            ? tmpl.byMethod
            : [];
      const groupedByMethod = byMethodRaw.some((item) => Array.isArray(item?.documents))
        ? byMethodRaw.map(normalizeByMethodGroup)
        : groupFlatMethodDocuments(byMethodRaw);
      const byMethod = groupedByMethod.map((g) => ({
        ...g,
        documents: (g.documents || []).map((d) => ({...normalizeDocItem(d), required: true})),
      }));

      setConfig((c) => ({
        ...c,
        documentRequirementsData: {
          ...c.documentRequirementsData,
          // Nút trong section "Theo phương thức tuyển sinh" chỉ áp dụng template cho byMethod.
          // Giữ nguyên mandatoryAll để tránh mất dữ liệu vừa import/chỉnh tay.
          mandatoryAll: c.documentRequirementsData?.mandatoryAll || [],
          byMethod,
        },
      }));
      enqueueSnackbar("Đã áp dụng mẫu hệ thống cho Cài đặt hồ sơ (chưa lưu DB).", {variant: "success"});
    } finally {
      setLoadingSystemAdmission(false);
    }
  }, []);

  const handleRestoreTemplateClick = useCallback((target = "admission") => {
    if (isDirty) {
      setRestoreTemplateTarget(target);
      setAdmissionRestoreConfirmOpen(true);
      return;
    }
    if (target === "documents") {
      void applySystemDocumentTemplateToForm();
      return;
    }
    void applySystemTemplateToForm();
  }, [isDirty, applySystemTemplateToForm, applySystemDocumentTemplateToForm]);

  const applyToggleAdmissionMethod = useCallback(
    (code, checked) => {
      const method = methodCatalog.find((m) => m.code === code);
      if (!method) return;
      setConfig((c) => {
        const prev = [...(c.admissionSettingsData.allowedMethods || [])];
        const next = checked
          ? [...prev.filter((m) => String(m?.code ?? "").trim() !== code), {...method}]
          : prev.filter((m) => String(m?.code ?? "").trim() !== code);
        return {...c, admissionSettingsData: {...c.admissionSettingsData, allowedMethods: next}};
      });
    },
    [methodCatalog]
  );

  const toggleAdmissionMethod = useCallback(
    (code, checked) => {
      if (!checked) {
        const c = String(code ?? "").trim();
        if (c && isMethodCodeReferencedInOtherConfig(c, config)) {
          setAdmissionToggleOffConfirm({open: true, code: c});
          return;
        }
      }
      applyToggleAdmissionMethod(code, checked);
    },
    [config, applyToggleAdmissionMethod]
  );

  const confirmToggleAdmissionOff = useCallback(() => {
    const c = admissionToggleOffConfirm.code;
    setAdmissionToggleOffConfirm({open: false, code: ""});
    if (c) applyToggleAdmissionMethod(c, false);
  }, [admissionToggleOffConfirm.code, applyToggleAdmissionMethod]);

  const addAdmissionMethod = useCallback(() => {
    setConfig((c) => ({
      ...c,
      admissionSettingsData: {
        ...c.admissionSettingsData,
        allowedMethods: [
          ...(c.admissionSettingsData.allowedMethods || []),
          {code: "", description: "", displayName: "", __isNewRow: true},
        ],
      },
    }));
  }, []);

  const updateAdmissionAllowedAt = useCallback((idx, patch) => {
    setConfig((c) => {
      const arr = [...(c.admissionSettingsData.allowedMethods || [])];
      if (!arr[idx]) return c;
      arr[idx] = {...arr[idx], ...patch};
      return {...c, admissionSettingsData: {...c.admissionSettingsData, allowedMethods: arr}};
    });
  }, []);

  const performRemoveAdmissionAllowedAt = useCallback((idx) => {
    setConfig((c) => {
      const arr = [...(c.admissionSettingsData.allowedMethods || [])];
      arr.splice(idx, 1);
      return {...c, admissionSettingsData: {...c.admissionSettingsData, allowedMethods: arr}};
    });
  }, []);

  const requestRemoveAdmissionAllowedAt = useCallback(
    (idx) => {
      const arr = config.admissionSettingsData?.allowedMethods || [];
      const m = arr[idx];
      if (!m) return;
      const code = String(m?.code ?? "").trim();
      if (code) {
        setAdmissionRemoveRowConfirm({open: true, idx});
        return;
      }
      performRemoveAdmissionAllowedAt(idx);
    },
    [config.admissionSettingsData?.allowedMethods, performRemoveAdmissionAllowedAt]
  );

  const confirmRemoveAdmissionRow = useCallback(() => {
    const idx = admissionRemoveRowConfirm.idx;
    setAdmissionRemoveRowConfirm({open: false, idx: -1});
    if (idx >= 0) performRemoveAdmissionAllowedAt(idx);
  }, [admissionRemoveRowConfirm.idx, performRemoveAdmissionAllowedAt]);

  const addMethodAdmissionProcess = useCallback(() => {
    let newIndex = 0;
    setConfig((c) => {
      const prev = [...(c.admissionSettingsData.methodAdmissionProcess || [])];
      newIndex = prev.length;
      prev.push({methodCode: "", steps: [{stepName: "", stepOrder: 1, description: ""}]});
      return {
        ...c,
        admissionSettingsData: {
          ...c.admissionSettingsData,
          methodAdmissionProcess: prev,
        },
      };
    });
    setTimeout(() => setPendingScrollToProcessIdx(newIndex), 0);
  }, []);

  const removeMethodAdmissionProcessAt = useCallback((groupIdx) => {
    setConfig((c) => {
      const arr = [...(c.admissionSettingsData.methodAdmissionProcess || [])];
      arr.splice(groupIdx, 1);
      return {...c, admissionSettingsData: {...c.admissionSettingsData, methodAdmissionProcess: arr}};
    });
  }, []);

  const updateMethodAdmissionProcessCode = useCallback((groupIdx, methodCode) => {
    setConfig((c) => {
      const arr = [...(c.admissionSettingsData.methodAdmissionProcess || [])];
      if (!arr[groupIdx]) return c;
      arr[groupIdx] = {...arr[groupIdx], methodCode};
      return {...c, admissionSettingsData: {...c.admissionSettingsData, methodAdmissionProcess: arr}};
    });
  }, []);

  const addAdmissionStepToMethod = useCallback((groupIdx) => {
    setConfig((c) => {
      const arr = [...(c.admissionSettingsData.methodAdmissionProcess || [])];
      const g = arr[groupIdx];
      if (!g) return c;
      const steps = [...(g.steps || [])];
      steps.push({stepName: "", stepOrder: steps.length + 1, description: ""});
      arr[groupIdx] = {...g, steps};
      return {...c, admissionSettingsData: {...c.admissionSettingsData, methodAdmissionProcess: arr}};
    });
  }, []);

  const updateAdmissionStepInMethod = useCallback((groupIdx, stepIdx, field, value) => {
    setConfig((c) => {
      const arr = [...(c.admissionSettingsData.methodAdmissionProcess || [])];
      const g = arr[groupIdx];
      if (!g) return c;
      const steps = (g.steps || []).map((s, i) => (i === stepIdx ? {...s, [field]: value} : s));
      arr[groupIdx] = {...g, steps};
      return {...c, admissionSettingsData: {...c.admissionSettingsData, methodAdmissionProcess: arr}};
    });
  }, []);

  const removeAdmissionStepInMethod = useCallback((groupIdx, stepIdx) => {
    setConfig((c) => {
      const arr = [...(c.admissionSettingsData.methodAdmissionProcess || [])];
      const g = arr[groupIdx];
      if (!g) return c;
      const steps = (g.steps || []).filter((_, i) => i !== stepIdx).map((s, i) => ({...s, stepOrder: i + 1}));
      arr[groupIdx] = {...g, steps};
      return {...c, admissionSettingsData: {...c.admissionSettingsData, methodAdmissionProcess: arr}};
    });
  }, []);

  const addAdmissionSeason = useCallback(() => {
    setConfig((c) => {
      const prev = [...(c.operationSettingsData.admissionSeasons || [])];
      prev.push({
        seasonName: "",
        startDate: "",
        endDate: "",
        enableSunday: false,
        minCounsellorMultiplier: 1,
        note: "",
        extraShifts: [],
      });
      return {
        ...c,
        operationSettingsData: {
          ...c.operationSettingsData,
          admissionSeasons: prev,
        },
      };
    });
  }, []);

  const removeAdmissionSeasonAt = useCallback((idx) => {
    setConfig((c) => {
      const arr = [...(c.operationSettingsData.admissionSeasons || [])];
      arr.splice(idx, 1);
      return {...c, operationSettingsData: {...c.operationSettingsData, admissionSeasons: arr}};
    });
  }, []);

  const updateAdmissionSeasonAt = useCallback((idx, patch) => {
    setConfig((c) => {
      const arr = [...(c.operationSettingsData.admissionSeasons || [])];
      if (!arr[idx]) return c;
      arr[idx] = {...arr[idx], ...patch};
      return {...c, operationSettingsData: {...c.operationSettingsData, admissionSeasons: arr}};
    });
  }, []);

  const addExtraShiftToAdmissionSeason = useCallback((seasonIdx) => {
    setConfig((c) => {
      const arr = [...(c.operationSettingsData.admissionSeasons || [])];
      const row = arr[seasonIdx];
      if (!row) return c;
      const extra = [...(row.extraShifts || []), {name: "EVENING", startTime: "17:00", endTime: "20:00"}];
      arr[seasonIdx] = {...row, extraShifts: extra};
      return {...c, operationSettingsData: {...c.operationSettingsData, admissionSeasons: arr}};
    });
  }, []);

  const updateExtraShiftInAdmissionSeason = useCallback((seasonIdx, shiftIdx, field, value) => {
    setConfig((c) => {
      const arr = [...(c.operationSettingsData.admissionSeasons || [])];
      const row = arr[seasonIdx];
      if (!row) return c;
      const extra = [...(row.extraShifts || [])];
      if (!extra[shiftIdx]) return c;
      extra[shiftIdx] = {...extra[shiftIdx], [field]: value};
      arr[seasonIdx] = {...row, extraShifts: extra};
      return {...c, operationSettingsData: {...c.operationSettingsData, admissionSeasons: arr}};
    });
  }, []);

  const removeExtraShiftFromAdmissionSeason = useCallback((seasonIdx, shiftIdx) => {
    setConfig((c) => {
      const arr = [...(c.operationSettingsData.admissionSeasons || [])];
      const row = arr[seasonIdx];
      if (!row) return c;
      const extra = (row.extraShifts || []).filter((_, i) => i !== shiftIdx);
      arr[seasonIdx] = {...row, extraShifts: extra};
      return {...c, operationSettingsData: {...c.operationSettingsData, admissionSeasons: arr}};
    });
  }, []);

  const addResourceAllocation = useCallback(() => {
    setConfig((c) => ({
      ...c,
      resourceDistributionData: {
        ...c.resourceDistributionData,
        allocations: [
          ...(c.resourceDistributionData?.allocations || []),
          {resourceType: RESOURCE_TYPE_OPTIONS[0]?.value ?? "counsellor", campusId: null, allocatedAmount: ""},
        ],
      },
    }));
  }, []);

  const updateResourceAllocationAt = useCallback((idx, patch) => {
    setConfig((c) => {
      const rows = [...(c.resourceDistributionData?.allocations || [])];
      if (!rows[idx]) return c;
      rows[idx] = {
        ...rows[idx],
        ...patch,
        resourceType: RESOURCE_TYPE_OPTIONS[0]?.value ?? "counsellor",
      };
      return {
        ...c,
        resourceDistributionData: {
          ...c.resourceDistributionData,
          allocations: rows,
        },
      };
    });
  }, []);

  const removeResourceAllocationAt = useCallback((idx) => {
    setConfig((c) => {
      const rows = [...(c.resourceDistributionData?.allocations || [])];
      rows.splice(idx, 1);
      return {
        ...c,
        resourceDistributionData: {
          ...c.resourceDistributionData,
          allocations: rows,
        },
      };
    });
  }, []);

  const onImportMandatoryDocsClick = useCallback(() => {
    if (fieldDisabled) return;
    mandatoryDocsImportInputRef.current?.click();
  }, [fieldDisabled]);

  const addMandatoryDocument = useCallback(() => {
    if (fieldDisabled) return;
    setConfig((c) => ({
      ...c,
      documentRequirementsData: {
        ...c.documentRequirementsData,
        mandatoryAll: [...(c.documentRequirementsData.mandatoryAll || []), {code: "", name: "", required: true}],
      },
    }));
  }, [fieldDisabled]);

  const onMandatoryDocsFileChange = useCallback(
    async (e) => {
      const file = e?.target?.files?.[0];
      e.target.value = "";
      if (!file) return;
      if (fieldDisabled) return;
      try {
        setMandatoryImportLoading(true);
        const res = await previewMandatoryDocsImport(file);
        const rows = Array.isArray(res?.data?.body)
          ? res.data.body.map((item, idx) => ({
            ...normalizeMandatoryImportRow(item, idx + 1),
            _key: `import-row-${idx + 1}-${Date.now()}`,
            _isValidating: false,
          }))
          : [];
        setMandatoryImportRows(rows);
        setMandatoryImportDialogOpen(true);
        enqueueSnackbar(res?.data?.message || "Đọc file hồ sơ thành công", {variant: "success"});
      } catch (err) {
        enqueueSnackbar(err?.response?.data?.message || err?.message || "Không thể import file hồ sơ bắt buộc chung", {
          variant: "error",
        });
      } finally {
        setMandatoryImportLoading(false);
      }
    },
    [fieldDisabled]
  );

  const closeMandatoryImportDialog = useCallback(() => {
    if (mandatoryImportConfirming) return;
    Object.values(mandatoryImportValidateTimersRef.current).forEach((timerId) => window.clearTimeout(timerId));
    mandatoryImportValidateTimersRef.current = {};
    setMandatoryImportDialogOpen(false);
  }, [mandatoryImportConfirming]);

  const validateMandatoryImportRowAt = useCallback(async (rowKey, rowPayload) => {
    try {
      const res = await validateMandatoryDocImportRow([rowPayload]);
      const validated = normalizeMandatoryImportRow(res?.data?.body ?? rowPayload, rowPayload?.rowData?.index ?? 1);
      setMandatoryImportRows((prev) =>
        prev.map((r) => {
          if (r._key !== rowKey) return r;
          const latestSeq = mandatoryImportValidateSeqRef.current[rowKey] ?? 0;
          if (latestSeq !== rowPayload._seq) return r;
          return {...r, ...validated, _isValidating: false};
        })
      );
    } catch (err) {
      const fallbackMessage = err?.response?.data?.message || "Không thể validate dòng";
      setMandatoryImportRows((prev) =>
        prev.map((r) => {
          if (r._key !== rowKey) return r;
          const latestSeq = mandatoryImportValidateSeqRef.current[rowKey] ?? 0;
          if (latestSeq !== rowPayload._seq) return r;
          return {
            ...r,
            isError: true,
            _isValidating: false,
            error: {
              fields: [{name: "row", message: fallbackMessage}],
            },
          };
        })
      );
    }
  }, []);

  const updateMandatoryImportRowCell = useCallback((rowKey, field, value) => {
    setMandatoryImportRows((prev) =>
      prev.map((r) => {
        if (r._key !== rowKey) return r;
        return {
          ...r,
          rowData: {
            ...r.rowData,
            [field]: value,
            required: true,
          },
          _isValidating: true,
        };
      })
    );

    const oldTimer = mandatoryImportValidateTimersRef.current[rowKey];
    if (oldTimer) window.clearTimeout(oldTimer);

    const nextSeq = (mandatoryImportValidateSeqRef.current[rowKey] ?? 0) + 1;
    mandatoryImportValidateSeqRef.current[rowKey] = nextSeq;

    mandatoryImportValidateTimersRef.current[rowKey] = window.setTimeout(() => {
      setMandatoryImportRows((currentRows) => {
        const latest = currentRows.find((r) => r._key === rowKey);
        if (!latest) return currentRows;
        const payload = {
          rowData: {
            index: latest.rowData?.index,
            code: String(latest.rowData?.code ?? ""),
            name: String(latest.rowData?.name ?? ""),
            required: true,
          },
          error: latest.error ?? null,
          isError: Boolean(latest.isError),
          _seq: nextSeq,
        };
        void validateMandatoryImportRowAt(rowKey, payload);
        return currentRows;
      });
    }, 400);
  }, [validateMandatoryImportRowAt]);

  const confirmMandatoryImportRows = useCallback(async () => {
    if (mandatoryImportHasAnyError || mandatoryImportLoading || mandatoryImportConfirming) return;
    try {
      setMandatoryImportConfirming(true);
      const payloadRows = (mandatoryImportRows || []).map((row, idx) => {
        const normalized = normalizeMandatoryImportRow(row, idx + 1);
        return {
          rowData: normalized.rowData,
          error: normalized.error,
          isError: normalized.isError,
        };
      });
      const res = await confirmMandatoryDocImportRows(payloadRows);
      const importedDocs = payloadRows.map((row) => ({...normalizeDocItem(row.rowData), required: true}));
      setConfig((c) => ({
        ...c,
        documentRequirementsData: {
          ...c.documentRequirementsData,
          mandatoryAll: importedDocs,
        },
      }));
      setMandatoryImportDialogOpen(false);
      enqueueSnackbar(res?.data?.message || "Import hồ sơ bắt buộc thành công", {variant: "success"});
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.message || err?.message || "Không thể lưu dữ liệu import", {variant: "error"});
    } finally {
      setMandatoryImportConfirming(false);
    }
  }, [mandatoryImportConfirming, mandatoryImportHasAnyError, mandatoryImportLoading, mandatoryImportRows]);

  const removeMandatoryDocumentAt = useCallback((idx) => {
    setConfig((c) => {
      const list = [...(c.documentRequirementsData.mandatoryAll || [])];
      if (!list[idx]) return c;
      list.splice(idx, 1);
      return {...c, documentRequirementsData: {...c.documentRequirementsData, mandatoryAll: list}};
    });
  }, []);

  const addDocumentToMethod = useCallback((gIdx) => {
    setConfig((c) => {
      const by = [...(c.documentRequirementsData.byMethod || [])];
      if (!by[gIdx]) return c;
      const docs = [...(by[gIdx].documents || []), {code: "", name: "", required: true}];
      by[gIdx] = normalizeByMethodGroup({...by[gIdx], documents: docs});
      return {...c, documentRequirementsData: {...c.documentRequirementsData, byMethod: by}};
    });
  }, []);

  const removeDocumentInMethod = useCallback((gIdx, dIdx) => {
    setConfig((c) => {
      const by = [...(c.documentRequirementsData.byMethod || [])];
      if (!by[gIdx]) return c;
      const docs = [...(by[gIdx].documents || [])];
      if (!docs[dIdx]) return c;
      docs.splice(dIdx, 1);
      by[gIdx] = normalizeByMethodGroup({...by[gIdx], documents: docs});
      return {...c, documentRequirementsData: {...c.documentRequirementsData, byMethod: by}};
    });
  }, []);

  const addByMethodGroup = useCallback(() => {
    setConfig((c) => ({
      ...c,
      documentRequirementsData: {
        ...c.documentRequirementsData,
        byMethod: [...(c.documentRequirementsData.byMethod || []), {methodCode: "", documents: []}],
      },
    }));
  }, []);

  const removeByMethodGroupAt = useCallback((gIdx) => {
    setConfig((c) => {
      const by = [...(c.documentRequirementsData.byMethod || [])];
      if (!by[gIdx]) return c;
      by.splice(gIdx, 1);
      return {...c, documentRequirementsData: {...c.documentRequirementsData, byMethod: by}};
    });
  }, []);

  const footerCancelSx = {
    textTransform: "none",
    fontWeight: 700,
    borderColor: "#cbd5e1",
    color: "#334155",
    borderRadius: 2,
    px: 2,
  };

  const footerSaveSx = {
    textTransform: "none",
    fontWeight: 800,
    borderRadius: 2,
    px: 2.5,
    bgcolor: "#2563eb",
    boxShadow: "0 10px 22px rgba(37, 99, 235, 0.22)",
    "&:hover": {bgcolor: "#1d4ed8"},
  };

  const showAdmissionTab = !useCampusConfigFlow && tabSlug === "admission";
  const showDocumentsTab = !useCampusConfigFlow && tabSlug === "documents";
  const showOperationTab = (!useCampusConfigFlow && tabSlug === "operation") || (useCampusConfigFlow && tabSlug === "operation");
  const showFinanceTab = !useCampusConfigFlow && tabSlug === "finance";
  const showFacilityTab = (!useCampusConfigFlow && tabSlug === "facility") || (useCampusConfigFlow && tabSlug === "facility");
  const showQuotaTab = !useCampusConfigFlow && tabSlug === "quota";
  const showResourceDistributionTab = !useCampusConfigFlow && tabSlug === "resource-distribution";


  const pageTitle = isCampusVariant ? "Cấu hình cơ sở của bạn" : "Cấu hình toàn trường";
  const pageSubtitle = isCampusVariant
    ? isPrimaryBranch
      ? "Bạn đang chỉnh giờ làm, lịch tư vấn và thông tin cơ sở vật chất tại cơ sở chính. Mỗi chi nhánh chỉ sửa được phần của mình. Sau khi Lưu, đoạn mô tả đầy đủ hiển thị trong mục «Nội dung chính sách đã lưu» bên dưới."
      : "Bạn đang chỉnh giờ làm, lịch tư vấn và cơ sở vật chất cho địa điểm bạn phụ trách. Sau khi Lưu, xem phần «Nội dung chính sách đã lưu» — văn bản do hệ thống ghép từ quy định trụ sở và chỉnh sửa tại cơ sở."
    : "Thiết lập chung áp dụng cho toàn trường: tuyển sinh, hồ sơ, vận hành, chỉ tiêu, tài chính, cơ sở vật chất và phân bổ nguồn lực giữa các cơ sở.";

  return (
      <Box
        sx={{
        p: {xs: 1, md: 2},
        borderRadius: 4,
        bgcolor: "#ffffff",
        color: "#1e293b",
        width: "100%",
        boxSizing: "border-box",
        pb: {xs: 6, md: 8},
      }}
    >
      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          mb: 2.5,
          color: "white",
          background: "linear-gradient(135deg, #7AA9EB 0%, #0D64DE 100%)",
          boxShadow: "0 8px 32px rgba(13, 100, 222, 0.25)",
        }}
      >
        <CardContent sx={{p: {xs: 2.2, md: 2.8}, "&:last-child": {pb: {xs: 2.2, md: 2.8}}}}>
          <Box sx={{display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2}}>
          <Box>
              <Typography variant="h5" sx={{fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2}}>
                {pageTitle}
            </Typography>
              <Typography variant="body2" sx={{mt: 0.75, opacity: 0.95}}>
                {pageSubtitle}
            </Typography>
              {lastLoadedAt && (
                <Typography variant="caption" sx={{display: "block", mt: 1.25, opacity: 0.88}}>
                  Tải lần cuối: {lastLoadedAt.toLocaleString("vi-VN")}
                </Typography>
              )}
          </Box>
          </Box>
        </CardContent>
      </Card>

      <Paper
        variant="outlined"
            sx={{
          borderRadius: 3,
          border: "1px solid #e2e8f0",
          bgcolor: "#ffffff",
          p: {xs: 1.5, md: 2},
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{mb: 1.5}}>
          <SettingsOutlinedIcon sx={{color: "#2563eb", fontSize: 22}}/>
          <Typography variant="subtitle1" sx={{fontWeight: 800, color: "#0f172a"}}>
            {pageTitle}
          </Typography>
        </Stack>

        {!(isCampusVariant && !useCampusConfigFlow && !(loading || schoolCtxLoading)) ? (
          <>
            <Tabs
              value={tabIndex}
              onChange={(_, v) => setTabIndex(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                borderBottom: "1px solid #e2e8f0",
                "& .MuiTabs-indicator": {height: 3, bgcolor: "#2563eb"},
                mb: 2,
              }}
            >
              {tabLabels.map((label, i) => (
                <Tab
                  key={tabSlugs[i]}
                  label={label}
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    color: "#64748b",
                    minHeight: 44,
                    fontSize: 13,
                    "&.Mui-selected": {
                      color: "#2563eb",
                    },
                  }}
                />
              ))}
            </Tabs>

            <Typography
              variant="subtitle1"
              component="h2"
              sx={{color: "#2563eb", fontWeight: 800, mb: 2, fontSize: "1.25rem", lineHeight: 1.35}}
            >
              {tabLabels[tabIndex]}
            </Typography>
          </>
        ) : null}

        <Box sx={{pt: 0.5}}>
          {isCampusVariant && !useCampusConfigFlow && !(loading || schoolCtxLoading) ? (
            <Card sx={{borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 8px 24px rgba(15,23,42,0.06)"}}>
              <CardContent sx={{p: 3}}>
                <Typography sx={{fontWeight: 700, mb: 1}}>Không tải được cấu hình cơ sở</Typography>
                <Typography variant="body2" sx={{color: "#64748b"}}>
                  {isPrimaryBranch
                    ? "Không xác định được cơ sở chính. Vui lòng kiểm tra danh sách cơ sở hoặc thử tải lại trang."
                    : "Không xác định được cơ sở đăng nhập. Vui lòng tải lại trang."}
                </Typography>
              </CardContent>
            </Card>
          ) : loading || schoolCtxLoading ? (
            <Box sx={{display: "flex", justifyContent: "center", py: 5}}>
              <CircularProgress/>
            </Box>
          ) : (
            <>
          {showAdmissionTab && (
            <Card sx={{borderRadius: "12px", border: "1px solid rgba(226,232,240,1)", boxShadow: "0 8px 24px rgba(15,23,42,0.06)"}}>
              <CardContent sx={{p: 3}}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1.5} sx={{mb: 2}}>
                  <Box sx={{minWidth: 0}}>
                    <Typography sx={{fontWeight: 800, fontSize: 18}}>Phương thức tuyển sinh</Typography>
                  </Box>
                  <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center" justifyContent="flex-end">
                    <Button
                      variant="outlined"
                      size="small"
                      disabled={loadingSystemAdmission || saving || !editing}
                      onClick={() => void applySystemTemplateToForm()}
                      sx={{textTransform: "none", fontWeight: 700, borderRadius: 2}}
                    >
                      Lấy mẫu từ hệ thống
                    </Button>
                    {admissionViewMode === "edit" ? (
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<AddIcon/>}
                        disabled={fieldDisabled}
                        onClick={addAdmissionMethod}
                        sx={{textTransform: "none", fontWeight: 700, borderRadius: 2, ...admissionBlockPointerSx}}
                      >
                        Thêm
                      </Button>
                    ) : null}
                  </Stack>
                </Stack>
                <Alert severity="info" sx={{mb: 2, borderRadius: 2}}>
                  Xóa hoặc đổi mã phương thức có thể làm lệch cấu hình khác (hồ sơ, quy trình). Trước khi xóa dòng hoặc bỏ bật phương thức đang được trỏ, hệ thống sẽ nhắc bạn.
                </Alert>
                {admissionViewMode === "preview" ? (
                  <Stack spacing={2} sx={{mb: 2}}>
                    <Typography variant="body2" color="text.secondary">
                      Đang bật{" "}
                      <strong>
                        {(config.admissionSettingsData?.allowedMethods || []).filter((m) => String(m?.code ?? "").trim()).length}
                      </strong>{" "}
                      phương thức (theo mã đã nhập).
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={1}>
                      {(config.admissionSettingsData?.allowedMethods || [])
                        .filter((m) => String(m?.code ?? "").trim())
                        .map((m) => (
                          <Chip
                            key={m.code}
                            size="small"
                            label={`${(m.displayName && String(m.displayName).trim()) || m.code} (${String(m.code).trim()})`}
                            variant="outlined"
                          />
                        ))}
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      Tự động đóng khi đủ chỉ tiêu: {config.admissionSettingsData.autoCloseOnFull ? "Có" : "Không"} — Ngưỡng cảnh báo:{" "}
                      {config.admissionSettingsData.quotaAlertThresholdPercent == null || config.admissionSettingsData.quotaAlertThresholdPercent === ""
                        ? "—"
                        : `${config.admissionSettingsData.quotaAlertThresholdPercent}%`}
                    </Typography>
                  </Stack>
                ) : null}
                {admissionViewMode === "edit" ? (
                <Stack spacing={1.5}>
                  {methodCatalog.map((m) => {
                    const hiddenByInlineEdit = (config.admissionSettingsData.allowedMethods || []).some(
                      (x) => Boolean(x?.__isNewRow) && String(x?.code ?? "").trim() === m.code
                    );
                    if (hiddenByInlineEdit) return null;
                    const checked = (config.admissionSettingsData.allowedMethods || []).some(
                      (x) => String(x?.code ?? "").trim() === m.code
                    );
                    const expandKey = `cat-${m.code}`;
                    const expanded = Boolean(admissionMethodExpanded[expandKey]);
                    const extras = admissionMethodExtraEntries(m);
                    return (
                      <Box
                        key={m.code}
                        sx={{
                          border: "1px solid rgba(226,232,240,1)",
                          borderRadius: "12px",
                          p: 2,
                          bgcolor: checked ? "rgba(37,99,235,0.04)" : "white",
                        }}
                      >
                        <Stack direction="row" alignItems="flex-start" spacing={0.5}>
                          <Box
                            sx={{
                              flex: 1,
                              minWidth: 0,
                              alignSelf: "stretch",
                              ...(admissionFormBlocked ? admissionBlockPointerSx : {}),
                            }}
                          >
                            <FormControlLabel
                              sx={{alignItems: "flex-start", m: 0, mr: 0}}
                              control={
                                <Checkbox
                                  checked={checked}
                                  onChange={(e) => {
                                    if (admissionFormBlocked) return;
                                    toggleAdmissionMethod(m.code, e.target.checked);
                                  }}
                                  sx={{pt: 0.35}}
                                />
                              }
                              label={<Typography sx={{fontWeight: 800}}>{m.displayName || m.code}</Typography>}
                            />
                          </Box>
                          <IconButton
                            size="small"
                            onClick={() => toggleAdmissionMethodExpand(expandKey)}
                            aria-expanded={expanded}
                            aria-label={expanded ? "Thu gọn chi tiết phương thức" : "Mở rộng xem đầy đủ thông tin"}
                            sx={{flexShrink: 0, mt: -0.25, color: "#64748b", pointerEvents: "auto"}}
                          >
                            <ExpandMoreIcon
                              sx={{
                                transform: expanded ? "rotate(180deg)" : "none",
                                transition: "transform 0.2s ease",
                              }}
                            />
                          </IconButton>
                        </Stack>
                        <Collapse in={!expanded}>
                          <Typography
                            variant="body2"
                            sx={{
                              color: "#64748b",
                              pl: 4.5,
                              pt: 0.5,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {(m.description && String(m.description).trim()) || "—"}
                          </Typography>
                        </Collapse>
                        <Collapse in={expanded}>
                          <Stack
                            spacing={1.25}
                            sx={{
                              pl: 4.5,
                              pt: 1.5,
                              mt: 1,
                              borderTop: "1px solid rgba(226,232,240,1)",
                            }}
                          >
                            <Box>
                              <Typography variant="caption" sx={{color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em"}}>
                                Mã
                              </Typography>
                              <Box sx={{mt: 0.5}}>
                                <Chip
                                  label={m.code?.trim() ? String(m.code) : "—"}
                                  size="small"
                                  sx={{
                                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                                    fontWeight: 700,
                                    fontSize: "0.8125rem",
                                    height: "auto",
                                    py: 0.4,
                                    bgcolor: "rgba(37, 99, 235, 0.1)",
                                    color: "#1e40af",
                                    border: "1px solid rgba(37, 99, 235, 0.35)",
                                    borderRadius: 2,
                                    "& .MuiChip-label": {px: 1.25, py: 0.25, wordBreak: "break-all", whiteSpace: "normal", textAlign: "left"},
                                  }}
                                />
                              </Box>
                            </Box>
                            <Box>
                              <Typography variant="caption" sx={{color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em"}}>
                                Tên hiển thị
                              </Typography>
                              <Typography variant="body2" sx={{wordBreak: "break-word"}}>
                                {(m.displayName && String(m.displayName).trim()) || "—"}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" sx={{color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em"}}>
                                Mô tả
                              </Typography>
                              <Typography variant="body2" sx={{color: "#475569", whiteSpace: "pre-wrap", wordBreak: "break-word"}}>
                                {(m.description && String(m.description).trim()) || "—"}
                              </Typography>
                            </Box>
                            {extras.length > 0 && (
                              <Box>
                                <Typography variant="caption" sx={{color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em"}}>
                                  Thông tin thêm (API)
                                </Typography>
                                <Stack spacing={1} sx={{mt: 0.75}}>
                                  {extras.map(([k, v]) => (
                                    <Box key={k}>
                                      <Typography variant="caption" sx={{color: "#64748b", fontWeight: 600}}>
                                        {k}
                                      </Typography>
                                      <Typography
                                        variant="body2"
                                        component="pre"
                                        sx={{
                                          m: 0,
                                          mt: 0.25,
                                          p: 1,
                                          borderRadius: 1,
                                          bgcolor: "rgba(241,245,249,0.9)",
                                          fontSize: 12,
                                          whiteSpace: "pre-wrap",
                                          wordBreak: "break-word",
                                          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                                        }}
                                      >
                                        {v != null && typeof v === "object" ? JSON.stringify(v, null, 2) : String(v ?? "—")}
                                      </Typography>
                                    </Box>
                                  ))}
                                </Stack>
                              </Box>
                            )}
                          </Stack>
                        </Collapse>
                      </Box>
                    );
                  })}
                  {(config.admissionSettingsData.allowedMethods || []).map((m, idx) => {
                    const showInlineForm = Boolean(m?.__isNewRow) || !String(m?.code ?? "").trim();
                    if (!showInlineForm) return null;
                    const draftExpandKey = `draft-${idx}`;
                    const draftExpanded = Boolean(admissionMethodExpanded[draftExpandKey]);
                    const draftExtras = admissionMethodExtraEntries(m);
                    return (
                      <Box
                        key={`admission-draft-${idx}`}
                        sx={{
                          border: "1px solid rgba(226,232,240,1)",
                          borderRadius: "12px",
                          p: 2,
                          bgcolor: "rgba(248,250,252,1)",
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1} sx={{mb: 1.5}}>
                          <Typography sx={{fontWeight: 800, color: "#0f172a"}}>Phương thức tùy chỉnh</Typography>
                          <Stack direction="row" alignItems="center" spacing={0}>
                            {fieldDisabled ? (
                              <IconButton
                                size="small"
                                onClick={() => toggleAdmissionMethodExpand(draftExpandKey)}
                                aria-expanded={draftExpanded}
                                aria-label={draftExpanded ? "Thu gọn chi tiết phương thức" : "Mở rộng xem đầy đủ thông tin"}
                                sx={{color: "#64748b", pointerEvents: "auto"}}
                              >
                                <ExpandMoreIcon
                                  sx={{
                                    transform: draftExpanded ? "rotate(180deg)" : "none",
                                    transition: "transform 0.2s ease",
                                  }}
                                />
                              </IconButton>
                            ) : null}
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => requestRemoveAdmissionAllowedAt(idx)}
                              aria-label="Xoá phương thức"
                              sx={admissionBlockPointerSx}
                            >
                              <DeleteOutlineIcon fontSize="small"/>
                            </IconButton>
                          </Stack>
                        </Stack>
                        {fieldDisabled ? (
                          <>
                            <Collapse in={!draftExpanded}>
                              <Typography
                                variant="body2"
                                sx={{
                                  color: "#64748b",
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                }}
                              >
                                {(m.description && String(m.description).trim()) ||
                                  (m.displayName || m.code || "—").toString()}
                              </Typography>
                            </Collapse>
                            <Collapse in={draftExpanded}>
                              <Stack spacing={1.25} sx={{pt: 0.5}}>
                                <Box>
                                  <Typography variant="caption" sx={{color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em"}}>
                                    Mã
                                  </Typography>
                                  <Box sx={{mt: 0.5}}>
                                    <Chip
                                      label={(m.code && String(m.code).trim()) || "—"}
                                      size="small"
                                      sx={{
                                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                                        fontWeight: 700,
                                        fontSize: "0.8125rem",
                                        height: "auto",
                                        py: 0.4,
                                        bgcolor: "rgba(37, 99, 235, 0.1)",
                                        color: "#1e40af",
                                        border: "1px solid rgba(37, 99, 235, 0.35)",
                                        borderRadius: 2,
                                        "& .MuiChip-label": {px: 1.25, py: 0.25, wordBreak: "break-all", whiteSpace: "normal", textAlign: "left"},
                                      }}
                                    />
                                  </Box>
                                </Box>
                                <Box>
                                  <Typography variant="caption" sx={{color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em"}}>
                                    Tên hiển thị
                                  </Typography>
                                  <Typography variant="body2" sx={{wordBreak: "break-word"}}>
                                    {(m.displayName && String(m.displayName).trim()) || "—"}
                                  </Typography>
                                </Box>
                                <Box>
                                  <Typography variant="caption" sx={{color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em"}}>
                                    Mô tả
                                  </Typography>
                                  <Typography variant="body2" sx={{color: "#475569", whiteSpace: "pre-wrap", wordBreak: "break-word"}}>
                                    {(m.description && String(m.description).trim()) || "—"}
                                  </Typography>
                                </Box>
                                {draftExtras.length > 0 && (
                                  <Box>
                                    <Typography variant="caption" sx={{color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em"}}>
                                      Thông tin thêm (API)
                                    </Typography>
                                    <Stack spacing={1} sx={{mt: 0.75}}>
                                      {draftExtras.map(([k, v]) => (
                                        <Box key={k}>
                                          <Typography variant="caption" sx={{color: "#64748b", fontWeight: 600}}>
                                            {k}
                                          </Typography>
                                          <Typography
                                            variant="body2"
                                            component="pre"
                                            sx={{
                                              m: 0,
                                              mt: 0.25,
                                              p: 1,
                                              borderRadius: 1,
                                              bgcolor: "rgba(241,245,249,0.9)",
                                              fontSize: 12,
                                              whiteSpace: "pre-wrap",
                                              wordBreak: "break-word",
                                              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                                            }}
                                          >
                                            {v != null && typeof v === "object" ? JSON.stringify(v, null, 2) : String(v ?? "—")}
                                          </Typography>
                                        </Box>
                                      ))}
                                    </Stack>
                                  </Box>
                                )}
                              </Stack>
                            </Collapse>
                          </>
                        ) : (
                          <Stack spacing={1.5}>
                            <TextField
                              size="small"
                              label="Mã (code)"
                              value={m.code ?? ""}
                              onChange={(e) => updateAdmissionAllowedAt(idx, {code: e.target.value})}
                              fullWidth
                            />
                            <TextField
                              size="small"
                              label="Tên hiển thị"
                              value={m.displayName ?? ""}
                              onChange={(e) => updateAdmissionAllowedAt(idx, {displayName: e.target.value})}
                              fullWidth
                            />
                            <TextField
                              size="small"
                              label="Mô tả"
                              value={m.description ?? ""}
                              onChange={(e) => updateAdmissionAllowedAt(idx, {description: e.target.value})}
                              fullWidth
                              multiline
                              minRows={2}
                            />
                          </Stack>
                        )}
                      </Box>
                    );
                  })}
                </Stack>
                ) : null}

                {admissionViewMode === "edit" ? (
                <>
                <Divider sx={{my: 3}}/>
                <Card sx={{borderRadius: "12px", border: "1px solid rgba(226,232,240,1)", boxShadow: "0 8px 24px rgba(15,23,42,0.06)"}}>
                  <CardContent sx={{p: 3}}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} mb={2} flexWrap="wrap">
                      <Box sx={{flex: 1, minWidth: 220}}>
                        <Typography sx={{fontWeight: 800}}>Quy trình tuyển sinh theo phương thức</Typography>
                      </Box>
                      <Button startIcon={<AddIcon/>} disabled={fieldDisabled} onClick={addMethodAdmissionProcess} sx={{textTransform: "none", flexShrink: 0, ...blockPointerSx}}>
                        Thêm phương thức
                      </Button>
                    </Stack>
                    <Stack spacing={2.5}>
                      {(config.admissionSettingsData.methodAdmissionProcess || []).length === 0 ? (
                        <Paper variant="outlined" sx={{p: 2, borderStyle: "dashed", color: "#64748b", borderRadius: 2}}>
                          Chưa có quy trình theo phương thức. Nhấn &quot;Thêm phương thức&quot; và chọn đúng mã (vd. ACADEMIC_RECORD,
                          INTERNAL_TEST).
                        </Paper>
                      ) : null}
                      {(config.admissionSettingsData.methodAdmissionProcess || []).map((group, gi) => {
                        const accent = METHOD_PROCESS_VISUAL_ACCENTS[0];
                        const codeTrim = (group.methodCode || "").trim();
                        const optMatch = admissionMethodCodeOptions.find((o) => o.value === codeTrim);
                        const methodSuggestionReadonlyDisplay = optMatch ? `${optMatch.label} (${codeTrim})` : codeTrim || "—";
                        return (
                        <Accordion
                          key={`adm-proc-${gi}`}
                          ref={(el) => {
                            if (el) methodAdmissionProcessGroupRefs.current[gi] = el;
                            else delete methodAdmissionProcessGroupRefs.current[gi];
                          }}
                          defaultExpanded
                          elevation={0}
                          disableGutters
                          sx={{
                            scrollMarginTop: "96px",
                            borderRadius: 2,
                            overflow: "hidden",
                            border: "1px solid",
                            borderColor: accent.border,
                            boxShadow: "none",
                            bgcolor: "#ffffff",
                            "&:before": {display: "none"},
                            "&.Mui-expanded": {margin: "10px 0"},
                          }}
                        >
                          <AccordionSummary
                            expandIcon={<ExpandMoreIcon sx={{color: accent.bar}}/>}
                            sx={{
                              px: 0,
                              pr: 1,
                              minHeight: 0,
                              background: accent.headerBg,
                              borderBottom: "2px solid",
                              borderBottomColor: accent.bar,
                              "& .MuiAccordionSummary-content": {
                                margin: "0 !important",
                                flexGrow: 1,
                                minWidth: 0,
                              },
                            }}
                          >
                            <Box sx={{width: "100%", px: 2, py: 1.5, pr: {xs: 1, sm: 2}}}>
                              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                                <Chip
                                  label={`Phương thức ${gi + 1}`}
                                  size="small"
                                  sx={{bgcolor: accent.bar, color: "#fff", fontWeight: 800, letterSpacing: "0.02em"}}
                                />
                                {group.methodCode?.trim() ? (
                                  <Chip
                                    label={group.methodCode.trim()}
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                      borderWidth: 2,
                                      borderColor: accent.bar,
                                      color: "#0f172a",
                                      fontWeight: 800,
                                      bgcolor: "rgba(255,255,255,0.85)",
                                    }}
                                  />
                                ) : (
                                  <Chip label="Chưa chọn phương thức" size="small" sx={{bgcolor: "#e2e8f0", color: "#475569", fontWeight: 700}} />
                                )}
                              </Stack>
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails sx={{p: 0, display: "block"}}>
                          <CardContent sx={{py: 2, px: 2, bgcolor: "rgba(248, 250, 252, 0.9)"}}>
                            <Stack spacing={2}>
                              <Stack direction={{xs: "column", sm: "row"}} spacing={1.5} alignItems={{sm: "flex-start"}} justifyContent="space-between">
                                <Box sx={{flex: 1, minWidth: 0, width: "100%"}}>
                                  <Stack spacing={1}>
                                    {fieldDisabled ? (
                                      <TextField
                                        label="Phương thức"
                                        size="small"
                                        fullWidth
                                        value={methodSuggestionReadonlyDisplay}
                                        InputProps={{readOnly: true}}
                                      />
                                    ) : (
                                      <TextField
                                        select
                                        label="Phương thức"
                                        size="small"
                                        fullWidth
                                        value={
                                          admissionMethodCodeOptions.some((o) => o.value === (group.methodCode || "").trim())
                                            ? (group.methodCode || "").trim()
                                            : "__custom__"
                                        }
                                        onChange={(e) => {
                                          const v = e.target.value;
                                          if (v === "__custom__") updateMethodAdmissionProcessCode(gi, "");
                                          else updateMethodAdmissionProcessCode(gi, v);
                                        }}
                                      >
                                        <MenuItem value="__custom__">
                                          <em>Chọn Phương Thức</em>
                                        </MenuItem>
                                        {admissionMethodCodeOptions.map((o) => (
                                          <MenuItem key={o.value} value={o.value}>
                                            {o.label} ({o.value})
                                          </MenuItem>
                                        ))}
                                      </TextField>
                                    )}
                                    <TextField
                                      label="Mã Phương Thức"
                                      size="small"
                                      fullWidth
                                      value={group.methodCode ?? ""}
                                      onChange={(e) => updateMethodAdmissionProcessCode(gi, e.target.value.trim())}
                                      placeholder="VD: ACADEMIC_RECORD"
                                      helperText="Phải trùng code phương thức đã cấu hình tuyển sinh / hồ sơ."
                                      inputProps={{readOnly: fieldDisabled}}
                                    />
                                  </Stack>
                                </Box>
                                <IconButton
                                  size="small"
                                  color="error"
                                  aria-label="Xoá nhóm phương thức"
                                  onClick={() => removeMethodAdmissionProcessAt(gi)}
                                  sx={{...blockPointerSx}}
                                >
                                  <DeleteOutlineIcon fontSize="small"/>
                                </IconButton>
                              </Stack>
                              <Divider sx={{borderColor: accent.stepsBorder, opacity: 1}}/>
                              <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                                <Typography
                                  variant="subtitle2"
                                  sx={{
                                    fontWeight: 800,
                                    color: "#0f172a",
                                    pl: 1,
                                    borderLeft: "4px solid",
                                    borderLeftColor: accent.bar,
                                  }}
                                >
                                  Các bước
                                </Typography>
                                <Button
                                  size="small"
                                  startIcon={<AddIcon/>}
                                  disabled={fieldDisabled}
                                  onClick={() => addAdmissionStepToMethod(gi)}
                                  sx={{textTransform: "none", ...blockPointerSx}}
                                >
                                  Thêm bước
                                </Button>
                              </Stack>
                              <Stack spacing={1.5}>
                                {(group.steps || []).map((step, si) => (
                                  <Card
                                    key={`step-${gi}-${si}`}
                                    variant="outlined"
                                    sx={{
                                      borderRadius: 2,
                                      bgcolor: accent.stepsBg,
                                      borderColor: accent.stepsBorder,
                                      borderWidth: 1,
                                    }}
                                  >
                                    <CardContent sx={{py: 1.5, "&:last-child": {pb: 1.5}}}>
                                      <Stack direction="row" spacing={1} alignItems="flex-start">
                                        <Box sx={{flex: 1}}>
                                          <Stack spacing={1.5}>
                                            <Chip
                                              size="small"
                                              label={`Bước ${step.stepOrder ?? si + 1}`}
                                              sx={{
                                                alignSelf: "flex-start",
                                                fontWeight: 700,
                                                bgcolor: "rgba(255,255,255,0.92)",
                                                border: `1px solid ${accent.stepsBorder}`,
                                                color: "#0f172a",
                                              }}
                                            />
                                            <TextField
                                              label="Tên bước"
                                              size="small"
                                              fullWidth
                                              value={step.stepName ?? ""}
                                              onChange={(e) => updateAdmissionStepInMethod(gi, si, "stepName", e.target.value)}
                                              inputProps={{readOnly: fieldDisabled}}
                                            />
                                            <TextField
                                              label="Mô tả"
                                              size="small"
                                              fullWidth
                                              multiline
                                              minRows={2}
                                              value={step.description ?? ""}
                                              onChange={(e) => updateAdmissionStepInMethod(gi, si, "description", e.target.value)}
                                              inputProps={{readOnly: fieldDisabled}}
                                            />
                                          </Stack>
                                        </Box>
                                        <IconButton
                                          size="small"
                                          color="error"
                                          onClick={() => removeAdmissionStepInMethod(gi, si)}
                                          aria-label="Xoá bước"
                                          sx={{alignSelf: "flex-start", mt: 0.25, ...blockPointerSx}}
                                        >
                                          <DeleteOutlineIcon fontSize="small"/>
                                        </IconButton>
                                      </Stack>
                                    </CardContent>
                                  </Card>
                                ))}
                              </Stack>
                            </Stack>
                          </CardContent>
                          </AccordionDetails>
                        </Accordion>
                        );
                      })}
                    </Stack>
                  </CardContent>
                </Card>
                <Divider sx={{my: 3}}/>
                <Stack spacing={2}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={Boolean(config.admissionSettingsData.autoCloseOnFull)}
                        onChange={(e) => {
                          if (fieldDisabled) return;
                          setConfig((c) => ({
                            ...c,
                            admissionSettingsData: {...c.admissionSettingsData, autoCloseOnFull: e.target.checked},
                          }));
                        }}
                        sx={blockPointerSx}
                      />
                    }
                    label={<Typography sx={{fontWeight: 700}}>Tự động đóng khi đủ chỉ tiêu</Typography>}
                  />

                  <TextField
                    label="Ngưỡng cảnh báo chỉ tiêu (%)"
                    size="small"
                    type="text"
                    value={
                      config.admissionSettingsData.quotaAlertThresholdPercent == null
                        ? ""
                        : String(config.admissionSettingsData.quotaAlertThresholdPercent)
                    }
                    onChange={(e) => {
                      if (fieldDisabled) return;
                      const raw = e.target.value.trim();
                      if (raw === "") {
                        setConfig((c) => ({
                          ...c,
                          admissionSettingsData: {...c.admissionSettingsData, quotaAlertThresholdPercent: ""},
                        }));
                        return;
                      }
                      if (!/^\d{1,3}$/.test(raw)) return;
                      const n = Number(raw);
                      setConfig((c) => ({
                        ...c,
                        admissionSettingsData: {
                          ...c.admissionSettingsData,
                          quotaAlertThresholdPercent: Math.min(100, Math.max(0, n)),
                        },
                      }));
                    }}
                    onBlur={() => {
                      if (fieldDisabled) return;
                      if (config.admissionSettingsData.quotaAlertThresholdPercent === "") return;
                      const n = Number(config.admissionSettingsData.quotaAlertThresholdPercent ?? 0);
                      const clamped = Math.min(100, Math.max(0, Number.isFinite(n) ? n : 0));
                      if (clamped !== n) {
                        setConfig((c) => ({
                          ...c,
                          admissionSettingsData: {...c.admissionSettingsData, quotaAlertThresholdPercent: clamped},
                        }));
                      }
                    }}
                    fullWidth
                    placeholder="0–100"
                    inputProps={{readOnly: fieldDisabled, inputMode: "numeric"}}
                  />
                </Stack>
                </>
                ) : null}
              </CardContent>
            </Card>
          )}

          {showQuotaTab && (
            <Card sx={{borderRadius: "12px", border: "1px solid rgba(226,232,240,1)", boxShadow: "0 8px 24px rgba(15,23,42,0.06)"}}>
              <CardContent sx={{p: 3}}>
                <Stack spacing={2}>
                  <TextField
                    label="Năm học"
                    value={config.quotaConfigData.academicYear ?? ""}
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        quotaConfigData: {...c.quotaConfigData, academicYear: e.target.value},
                      }))
                    }
                    fullWidth
                    size="small"
                    placeholder="Ví dụ: 2026-2027"
                    inputProps={{readOnly: true}}
                  />
                  <TextField
                    label="Tổng chỉ tiêu toàn hệ thống"
                    type="number"
                    value={
                      config.quotaConfigData.totalSystemQuota === "" || config.quotaConfigData.totalSystemQuota == null
                        ? ""
                        : config.quotaConfigData.totalSystemQuota
                    }
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        quotaConfigData: {
                          ...c.quotaConfigData,
                          totalSystemQuota: e.target.value === "" ? "" : Number(e.target.value) || 0,
                        },
                      }))
                    }
                    fullWidth
                    size="small"
                    inputProps={{readOnly: true}}
                  />

                  <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography sx={{fontWeight: 700}}>Phân bổ theo cơ sở</Typography>
                      <Chip
                        size="small"
                        label={`Đã phân: ${allocatedTotal} / ${systemQuota || "—"}`}
                        color={quotaMismatch ? "warning" : "default"}
                      />
                    </Stack>
                    {systemQuota > 0 && (
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, (allocatedTotal / systemQuota) * 100)}
                        sx={{height: 10, borderRadius: 999, mb: 1}}
                      />
                    )}
                    {quotaMismatch && (
                      <Typography variant="caption" color="warning.main">
                        Tổng phân bổ cơ sở khác tổng chỉ tiêu hệ thống.
                </Typography>
                    )}
                  </Box>

                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Cơ sở</TableCell>
                        <TableCell align="right">Chỉ tiêu phân bổ</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(config.quotaConfigData.campusAssignments || []).map((row, idx) => (
                        <TableRow key={row.campusId ?? idx}>
                          <TableCell>{row.campusName}</TableCell>
                          <TableCell align="right">
                            <TextField
                              type="number"
                              size="small"
                              value={row.allocatedQuota === "" || row.allocatedQuota == null ? "" : row.allocatedQuota}
                              onChange={(e) => {
                                const v = e.target.value === "" ? "" : Number(e.target.value) || 0;
                                setConfig((c) => {
                                  const rows = [...(c.quotaConfigData.campusAssignments || [])];
                                  rows[idx] = {...rows[idx], allocatedQuota: v};
                                  return {...c, quotaConfigData: {...c.quotaConfigData, campusAssignments: rows}};
                                });
                              }}
                              sx={{width: 140}}
                              inputProps={{readOnly: fieldDisabled}}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Stack>
              </CardContent>
            </Card>
          )}

          {showFinanceTab && (
            <Card sx={{borderRadius: "12px", border: "1px solid rgba(226,232,240,1)", boxShadow: "0 8px 24px rgba(15,23,42,0.06)"}}>
              <CardContent sx={{p: 3}}>
                <Stack spacing={3}>
                  <Stack direction={{xs: "column", sm: "row"}} spacing={2}>
                    <TextField
                      label="Hạn mức giảm tối đa / so với giá gốc (%)"
                      type="number"
                      value={
                        config.financePolicyData.priceAdjustment?.minPercent === "" ||
                        config.financePolicyData.priceAdjustment?.minPercent == null
                          ? ""
                          : config.financePolicyData.priceAdjustment.minPercent
                      }
                      onChange={(e) =>
                        setConfig((c) => ({
                          ...c,
                          financePolicyData: {
                            ...c.financePolicyData,
                            priceAdjustment: {
                              ...c.financePolicyData.priceAdjustment,
                              minPercent: e.target.value === "" ? "" : Number(e.target.value) || 0,
                            },
                          },
                        }))
                      }
                      fullWidth
                      size="small"
                      inputProps={{readOnly: fieldDisabled}}
                    />
                    <TextField
                      label="Hạn mức tăng tối đa / so với giá gốc (%)"
                      type="number"
                      value={
                        config.financePolicyData.priceAdjustment?.maxPercent === "" ||
                        config.financePolicyData.priceAdjustment?.maxPercent == null
                          ? ""
                          : config.financePolicyData.priceAdjustment.maxPercent
                      }
                      onChange={(e) =>
                        setConfig((c) => ({
                          ...c,
                          financePolicyData: {
                            ...c.financePolicyData,
                            priceAdjustment: {
                              ...c.financePolicyData.priceAdjustment,
                              maxPercent: e.target.value === "" ? "" : Number(e.target.value) || 0,
                            },
                          },
                        }))
                      }
                      fullWidth
                      size="small"
                      inputProps={{readOnly: fieldDisabled}}
                    />
                  </Stack>
                  <Alert severity="info" sx={{borderRadius: 2}}>
                    <Typography variant="body2" component="div" sx={{fontWeight: 700, mb: 0.75}}>
                      Lưu ý:
                    </Typography>
                    <Typography variant="body2" component="div" sx={{lineHeight: 1.65}}>
                      Cấu hình này xác định hạn mức điều chỉnh giá cho cơ sở mà cơ sở chính cấp phép cho các cơ sở con.
                      Nó cho phép giá dịch vụ/học phí tại mỗi cơ sở linh hoạt hơn so với giá gốc của cơ sở chính mà vẫn
                      nằm trong tầm kiểm soát.
                      <br/>
                      <strong>1. Hạn mức giảm tối đa so với giá gốc</strong>
                      <br/>- Cho phép cơ sở con giảm tối đa bao nhiêu % so với giá của cơ sở chính để cạnh tranh
                      hoặc ưu đãi vùng miền. Nếu để 0 (%), cơ sở con tuyệt đối không được thu thấp hơn giá niêm yết của
                      cơ sở chính.
                      <br/>
                      <strong>2. Hạn mức tăng tối đa so với giá gốc</strong>
                      <br/>- Cho phép cơ sở con tăng giá thêm tối đa bao nhiêu % (có thể do chi phí vận hành tại khu
                      vực đó cao hơn, ví dụ trung tâm Quận 1 so với các quận khác).
                    </Typography>
                  </Alert>
                </Stack>
              </CardContent>
            </Card>
          )}

          {showDocumentsTab && (
            <Card sx={{borderRadius: "12px", border: "1px solid rgba(226,232,240,1)", boxShadow: "0 8px 24px rgba(15,23,42,0.06)"}}>
              <CardContent sx={{p: 3}}>
                <Stack spacing={1.25} sx={{mb: 2}}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography sx={{fontWeight: 800}}>Hồ sơ bắt buộc chung</Typography>
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<AddIcon/>}
                        onClick={addMandatoryDocument}
                        disabled={fieldDisabled}
                        sx={{textTransform: "none", fontWeight: 700, borderRadius: 2, ...blockPointerSx}}
                      >
                        Thêm
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<CloudUploadOutlinedIcon/>}
                        onClick={onImportMandatoryDocsClick}
                        disabled={fieldDisabled}
                        sx={{textTransform: "none", fontWeight: 700, borderRadius: 2, ...blockPointerSx}}
                      >
                        Import file
                      </Button>
                    </Stack>
                    <input
                      ref={mandatoryDocsImportInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      style={{display: "none"}}
                      onChange={onMandatoryDocsFileChange}
                      disabled={fieldDisabled}
                    />
                  </Stack>
                  <Alert severity="info" sx={{borderRadius: 2, maxWidth: 1200}}>
                    <Typography variant="body2" component="div" sx={{fontWeight: 700, mb: 0.75}}>
                      Lưu ý:
                    </Typography>
                    <Typography variant="body2" component="div" sx={{lineHeight: 1.65}}>
                      Đây là danh sách hồ sơ bắt buộc cho <strong>TẤT CẢ</strong> thí sinh, dù chọn bất kỳ phương
                      thức xét tuyển nào.
                    </Typography>
                  </Alert>
                </Stack>
                <Stack spacing={1}>
                  {(config.documentRequirementsData.mandatoryAll || []).map((doc, idx) => (
                    <Box
                      key={`mandatory-${idx}`}
                      sx={{
                        display: "flex",
                        flexDirection: {xs: "column", sm: "row"},
                        alignItems: {xs: "stretch", sm: "center"},
                        justifyContent: "space-between",
                        gap: 1.5,
                        border: "1px solid #e2e8f0",
                        borderRadius: 2,
                        p: 1.5,
                      }}
                    >
                      {fieldDisabled ? (
                        <Typography sx={{fontWeight: 600}}>{doc.name || doc.code || "—"}</Typography>
                      ) : (
                        <Stack direction={{xs: "column", sm: "row"}} spacing={1} sx={{flex: 1, minWidth: 0}}>
                          <TextField
                            size="small"
                            label="Mã"
                            value={doc.code ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setConfig((c) => {
                                const list = [...(c.documentRequirementsData.mandatoryAll || [])];
                                list[idx] = {...list[idx], code: v, required: true};
                                return {...c, documentRequirementsData: {...c.documentRequirementsData, mandatoryAll: list}};
                              });
                            }}
                            sx={{minWidth: {sm: 140}}}
                          />
                          <TextField
                            size="small"
                            label="Tên"
                            value={doc.name ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setConfig((c) => {
                                const list = [...(c.documentRequirementsData.mandatoryAll || [])];
                                list[idx] = {...list[idx], name: v, required: true};
                                return {...c, documentRequirementsData: {...c.documentRequirementsData, mandatoryAll: list}};
                              });
                            }}
                            fullWidth
                          />
                        </Stack>
                      )}
                      <Stack direction="row" alignItems="center" spacing={1} sx={{flexShrink: 0}}>
                        <Typography variant="caption" sx={{color: "#3b82f6", fontWeight: 700}}>
                          Bắt buộc
                        </Typography>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeMandatoryDocumentAt(idx)}
                          aria-label="Xoá hồ sơ bắt buộc chung"
                          disabled={fieldDisabled}
                          sx={blockPointerSx}
                        >
                          <DeleteOutlineIcon fontSize="small"/>
                        </IconButton>
                      </Stack>
                    </Box>
                  ))}
                </Stack>

                <Divider sx={{my: 3}}/>

                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{mb: 2}}>
                  <Typography sx={{fontWeight: 800}}>Theo phương thức tuyển sinh</Typography>
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      size="small"
                      disabled={loadingSystemAdmission || saving || !editing}
                      onClick={() => void applySystemDocumentTemplateToForm()}
                      sx={{textTransform: "none", fontWeight: 700, borderRadius: 2}}
                    >
                      Lấy mẫu từ hệ thống
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<AddIcon/>}
                      disabled={fieldDisabled}
                      onClick={addByMethodGroup}
                      sx={{textTransform: "none", fontWeight: 700, borderRadius: 2, ...blockPointerSx}}
                    >
                      Thêm nhóm phương thức
                    </Button>
                  </Stack>
                </Stack>
                <Alert severity="info" sx={{borderRadius: 2, maxWidth: 1200, mb: 2.5}}>
                  <Typography variant="body2" component="div" sx={{fontWeight: 700, mb: 0.75}}>
                    Lưu ý:
                  </Typography>
                  <Typography variant="body2" component="div" sx={{lineHeight: 1.65}}>
                    Đây là các hồ sơ bổ sung riêng biệt cho <strong>TỪNG PHƯƠNG THỨC</strong> để phục vụ việc chấm
                    điểm và xét duyệt.
                  </Typography>
                </Alert>

                {(config.documentRequirementsData.byMethod || []).map((group, gIdx) => {
                  const summaryLabel = group.methodCode?.trim() ? group.methodCode : `Nhóm ${gIdx + 1}`;
                  const currentMc = String(group.methodCode ?? "").trim();
                  const allowedCodes = new Set(allowedMethodsDocumentDropdown.map((o) => o.value));
                  const orphanMethodCode = currentMc && !allowedCodes.has(currentMc) ? currentMc : "";
                            return (
                  <Accordion
                    key={`by-method-acc-${gIdx}`}
                    defaultExpanded
                    elevation={0}
                    sx={{
                      mb: 1,
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px !important",
                      boxShadow: "none",
                      "&:before": {display: "none"},
                      "&.Mui-expanded": {boxShadow: "none", margin: 0, mb: 1},
                    }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon/>}>
                      <Box sx={{display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", pr: 1}}>
                        <Typography sx={{fontWeight: 700}}>{summaryLabel}</Typography>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeByMethodGroupAt(gIdx);
                          }}
                          aria-label="Xoá nhóm phương thức tuyển sinh"
                          disabled={fieldDisabled}
                          sx={blockPointerSx}
                        >
                          <DeleteOutlineIcon fontSize="small"/>
                        </IconButton>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={1.5}>
                        <TextField
                          select
                          size="small"
                          label="Phương thức"
                          value={currentMc || ""}
                          fullWidth
                          disabled={fieldDisabled}
                          onChange={(e) => {
                            const v = e.target.value;
                            setConfig((c) => {
                              const by = [...(c.documentRequirementsData.byMethod || [])];
                              by[gIdx] = normalizeByMethodGroup({...by[gIdx], methodCode: v});
                              return {...c, documentRequirementsData: {...c.documentRequirementsData, byMethod: by}};
                            });
                          }}
                          helperText={
                            allowedMethodsDocumentDropdown.length === 0
                              ? "Thêm và bật phương thức trong tab Cài đặt Tuyển sinh (allowedMethods) để chọn tại đây."
                              : "Chọn một phương thức đã cấu hình ở tab Cài đặt Tuyển sinh."
                          }
                        >
                          <MenuItem value="">
                            <em>Chọn phương thức</em>
                          </MenuItem>
                          {orphanMethodCode ? (
                            <MenuItem value={orphanMethodCode}>
                              {orphanMethodCode} — không còn trong Tuyển sinh (nên chọn lại)
                            </MenuItem>
                          ) : null}
                          {allowedMethodsDocumentDropdown.map((o) => (
                            <MenuItem key={o.value} value={o.value}>
                              {o.label}
                            </MenuItem>
                          ))}
                        </TextField>
                        <Box sx={{display: "flex", justifyContent: "flex-end"}}>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<AddIcon/>}
                            disabled={fieldDisabled}
                            onClick={() => addDocumentToMethod(gIdx)}
                            sx={{textTransform: "none", fontWeight: 700, borderRadius: 2, ...blockPointerSx}}
                          >
                            Thêm hồ sơ
                          </Button>
                                </Box>
                        {(group.documents || []).map((doc, dIdx) => (
                          <Box
                            key={`by-method-${gIdx}-${dIdx}`}
                            sx={{
                              display: "flex",
                              flexDirection: {xs: "column", sm: "row"},
                              alignItems: {xs: "stretch", sm: "center"},
                              justifyContent: "space-between",
                              gap: 1.5,
                              border: "1px solid #e2e8f0",
                              borderRadius: 2,
                              p: 1.5,
                            }}
                          >
                            {fieldDisabled ? (
                              <Typography>{doc.name || doc.code || "—"}</Typography>
                            ) : (
                              <Stack direction={{xs: "column", sm: "row"}} spacing={1} sx={{flex: 1, minWidth: 0}}>
                                <TextField
                                  size="small"
                                  label="Mã"
                                  value={doc.code ?? ""}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setConfig((c) => {
                                      const by = [...(c.documentRequirementsData.byMethod || [])];
                                      const docs = [...(by[gIdx].documents || [])];
                                      docs[dIdx] = normalizeDocItem({...docs[dIdx], code: v});
                                      by[gIdx] = normalizeByMethodGroup({...by[gIdx], documents: docs});
                                      return {...c, documentRequirementsData: {...c.documentRequirementsData, byMethod: by}};
                                    });
                                  }}
                                  sx={{minWidth: {sm: 140}}}
                                />
                                <TextField
                                  size="small"
                                  label="Tên"
                                  value={doc.name ?? ""}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setConfig((c) => {
                                      const by = [...(c.documentRequirementsData.byMethod || [])];
                                      const docs = [...(by[gIdx].documents || [])];
                                      docs[dIdx] = normalizeDocItem({...docs[dIdx], name: v});
                                      by[gIdx] = normalizeByMethodGroup({...by[gIdx], documents: docs});
                                      return {...c, documentRequirementsData: {...c.documentRequirementsData, byMethod: by}};
                                    });
                                  }}
                                  fullWidth
                                />
                              </Stack>
                            )}
                            <Stack direction="row" alignItems="center" spacing={1} sx={{flexShrink: 0, alignSelf: {xs: "flex-end", sm: "center"}}}>
                              <Typography variant="caption">Bắt buộc</Typography>
                              <Switch
                                checked={Boolean(doc.required)}
                                onChange={(e) => {
                                  if (fieldDisabled) return;
                                  const v = e.target.checked;
                                  setConfig((c) => {
                                    const by = [...(c.documentRequirementsData.byMethod || [])];
                                    const docs = [...(by[gIdx].documents || [])];
                                    docs[dIdx] = normalizeDocItem({...docs[dIdx], required: v});
                                    by[gIdx] = normalizeByMethodGroup({...by[gIdx], documents: docs});
                                    return {...c, documentRequirementsData: {...c.documentRequirementsData, byMethod: by}};
                                  });
                                }}
                                sx={blockPointerSx}
                              />
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => removeDocumentInMethod(gIdx, dIdx)}
                                aria-label="Xoá hồ sơ theo phương thức"
                                disabled={fieldDisabled}
                                sx={blockPointerSx}
                              >
                                <DeleteOutlineIcon fontSize="small"/>
                              </IconButton>
                            </Stack>
                              </Box>
                        ))}
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                            );
                          })}
              </CardContent>
            </Card>
          )}

          {showOperationTab && (
            <Stack spacing={2}>
              {useCampusConfigFlow ? (
                <>
                  {campusHqOperationMissing ? (
                    <Alert severity="warning" sx={{borderRadius: 2}}>
                      <Typography variant="body2" sx={{fontWeight: 700, mb: 0.5}}>
                        Chưa có quy định vận hành từ trụ sở chính
                      </Typography>
                      <Typography variant="body2" component="div" sx={{lineHeight: 1.65}}>
                        Hệ thống chưa nhận được bộ quy tắc vận hành do trụ sở chính thiết lập (hoặc dữ liệu đang trống). Vui lòng
                        đăng nhập tài khoản trụ sở chính, mở mục <strong>Cài đặt vận hành</strong> và lưu cấu hình trước. Sau đó
                        cơ sở chi nhánh mới có thể điều chỉnh phần riêng tại từng địa điểm.
                      </Typography>
                    </Alert>
                  ) : null}
                  <Alert severity="info" sx={{borderRadius: 2}}>
                    <Typography variant="body2" component="div" sx={{fontWeight: 700, mb: 0.75}}>
                      Chỉnh sửa riêng cho cơ sở này
                    </Typography>
                    <Typography variant="body2" component="div" sx={{lineHeight: 1.65}}>
                      Các thay đổi được lưu và hiển thị tóm tắt trong phần <strong>Nội dung chính sách đã lưu</strong> bên dưới.
                    </Typography>
                  </Alert>
                  <Card
                    sx={{
                      borderRadius: "12px",
                      border: "1px solid rgba(13, 100, 222, 0.22)",
                      boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
                      bgcolor: "rgba(13, 100, 222, 0.03)",
                    }}
                  >
                    <CardContent sx={{p: 3}}>
                      <Typography sx={{fontWeight: 800, mb: 1.5}}>Nội dung chính sách đã lưu</Typography>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 2,
                          maxHeight: 400,
                          overflow: "auto",
                          bgcolor: "#ffffff",
                          borderColor: "#e2e8f0",
                        }}
                      >
                        {branchPolicyFullTextRendered ? (
                          <Typography
                            component="pre"
                            sx={{
                              m: 0,
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                              fontSize: "0.875rem",
                              lineHeight: 1.65,
                              color: "#334155",
                            }}
                          >
                            {branchPolicyFullTextRendered}
                          </Typography>
                        ) : (
                          <Typography variant="body2" sx={{color: "#94a3b8"}}>
                            Chưa có nội dung. Sau khi lưu cấu hình vận hành, máy chủ sẽ trả về nội dung tại đây khi tải lại trang hoặc sau khi Lưu thành công.
                          </Typography>
                        )}
                      </Paper>
                    </CardContent>
                  </Card>
                </>
              ) : null}
              <Card sx={{borderRadius: "12px", border: "1px solid rgba(226,232,240,1)", boxShadow: "0 8px 24px rgba(15,23,42,0.06)"}}>
                <CardContent sx={{p: 3}}>
                  <Stack spacing={2}>
                    <TextField
                      label="Hotline"
                      value={config.operationSettingsData.hotline ?? ""}
                      onChange={(e) =>
                        setConfig((c) => ({
                          ...c,
                          operationSettingsData: {...c.operationSettingsData, hotline: e.target.value},
                        }))
                      }
                      fullWidth
                      size="small"
                      inputProps={{readOnly: fieldDisabled}}
                    />
                    <TextField
                      label="Email hỗ trợ"
                      value={config.operationSettingsData.emailSupport ?? ""}
                      onChange={(e) =>
                        setConfig((c) => ({
                          ...c,
                          operationSettingsData: {...c.operationSettingsData, emailSupport: e.target.value},
                        }))
                      }
                      fullWidth
                      size="small"
                      inputProps={{readOnly: fieldDisabled}}
                    />
                    {useCampusConfigFlow ? (
                      <Box sx={{width: "100%"}}>
                        <HqVsCampusSlotBufferSummary
                          effectiveOp={config.operationSettingsData}
                          hqOp={branchHqOperation}
                          hqMissing={campusHqOperationMissing}
                        />
                      </Box>
                    ) : null}
                    <Box
                      sx={{
                        display: "grid",
                        gap: 2,
                        width: "100%",
                        gridTemplateColumns: {
                          xs: "1fr",
                          sm: "repeat(2, minmax(0, 1fr))",
                          md: "repeat(3, minmax(0, 1fr))",
                        },
                      }}
                    >
                      <Box sx={{minWidth: 0}}>
                        {useCampusConfigFlow ? (
                          <Stack direction="row" alignItems="center" spacing={1} sx={{mb: 0.5, minHeight: 24}}>
                            <HqScalarDiffChip
                              fieldKey="maxBookingPerSlot"
                              effectiveOp={config.operationSettingsData}
                              hqOp={branchHqOperation}
                              hqMissing={campusHqOperationMissing}
                            />
                          </Stack>
                        ) : null}
                        <TextField
                          label="Số phụ huynh tối đa trong 1 slot"
                          type="number"
                          value={
                            config.operationSettingsData.maxBookingPerSlot === "" ||
                            config.operationSettingsData.maxBookingPerSlot == null
                              ? ""
                              : config.operationSettingsData.maxBookingPerSlot
                          }
                          onChange={(e) =>
                            setConfig((c) => ({
                              ...c,
                              operationSettingsData: {
                                ...c.operationSettingsData,
                                maxBookingPerSlot: e.target.value === "" ? "" : Number(e.target.value) || 0,
                              },
                            }))
                          }
                          size="small"
                          helperText="Dành cho phụ huynh khi đặt lịch: tối đa bao nhiêu lượt đặt hoặc chờ trong một khung giờ. Không phải số tư vấn viên — xem hai ô bên cạnh."
                          FormHelperTextProps={{sx: {fontWeight: 500, color: "#64748b"}}}
                          inputProps={{readOnly: fieldDisabled, min: 0}}
                          fullWidth
                        />
                      </Box>
                      <Box sx={{minWidth: 0}}>
                        <TextField
                          label="Tư vấn viên tối thiểu trong 1 slot"
                          type="number"
                          value={
                            config.operationSettingsData.minCounsellorPerSlot === "" ||
                            config.operationSettingsData.minCounsellorPerSlot == null
                              ? ""
                              : config.operationSettingsData.minCounsellorPerSlot
                          }
                          onChange={(e) =>
                            setConfig((c) => ({
                              ...c,
                              operationSettingsData: {
                                ...c.operationSettingsData,
                                minCounsellorPerSlot: e.target.value === "" ? "" : Number(e.target.value) || 0,
                              },
                            }))
                          }
                          size="small"
                          helperText="Khi gán lịch cho tư vấn viên: mỗi khung giờ và khoảng ngày phải có ít nhất số người này. Không liên quan tới lượt đặt của phụ huynh (ô bên trái)."
                          FormHelperTextProps={{sx: {fontWeight: 500, color: "#64748b"}}}
                          inputProps={{readOnly: fieldDisabled, min: 0}}
                          fullWidth
                        />
                      </Box>
                      <Box sx={{minWidth: 0}}>
                        {useCampusConfigFlow ? (
                          <Stack direction="row" alignItems="center" spacing={1} sx={{mb: 0.5, minHeight: 24}}>
                            <HqScalarDiffChip
                              fieldKey="maxCounsellorsPerSlot"
                              effectiveOp={config.operationSettingsData}
                              hqOp={branchHqOperation}
                              hqMissing={campusHqOperationMissing}
                            />
                          </Stack>
                        ) : null}
                        <TextField
                          label="Tư vấn viên tối đa gán cùng khung"
                          type="number"
                          value={
                            config.operationSettingsData.maxCounsellorsPerSlot === "" ||
                            config.operationSettingsData.maxCounsellorsPerSlot == null
                              ? ""
                              : config.operationSettingsData.maxCounsellorsPerSlot
                          }
                          onChange={(e) =>
                            setConfig((c) => ({
                              ...c,
                              operationSettingsData: {
                                ...c.operationSettingsData,
                                maxCounsellorsPerSlot:
                                  e.target.value === "" ? "" : Math.max(0, Number(e.target.value) || 0),
                              },
                            }))
                          }
                          size="small"
                          helperText="Giới hạn nhân sự: tối đa bao nhiêu tư vấn viên được gán chung một khung giờ và cùng khoảng ngày. 0 = không giới hạn. Khác với lượt đặt của phụ huynh."
                          FormHelperTextProps={{sx: {fontWeight: 500, color: "#64748b"}}}
                          inputProps={{readOnly: fieldDisabled, min: 0}}
                          fullWidth
                        />
                      </Box>
                      <Box sx={{minWidth: 0}}>
                        {useCampusConfigFlow ? (
                          <Stack direction="row" alignItems="center" spacing={1} sx={{mb: 0.5, minHeight: 24}}>
                            <HqScalarDiffChip
                              fieldKey="slotDurationInMinutes"
                              effectiveOp={config.operationSettingsData}
                              hqOp={branchHqOperation}
                              hqMissing={campusHqOperationMissing}
                            />
                          </Stack>
                        ) : null}
                        <TextField
                          label="(*) Thời lượng 1 slot (phút)"
                          type="number"
                          value={
                            config.operationSettingsData.slotDurationInMinutes === "" ||
                            config.operationSettingsData.slotDurationInMinutes == null
                              ? ""
                              : config.operationSettingsData.slotDurationInMinutes
                          }
                          onChange={(e) =>
                            setConfig((c) => ({
                              ...c,
                              operationSettingsData: {
                                ...c.operationSettingsData,
                                slotDurationInMinutes:
                                  e.target.value === ""
                                    ? ""
                                    : Math.max(1, Number(e.target.value) || 0),
                              },
                            }))
                          }
                          size="small"
                          helperText="*Thời lượng của một cuộc hẹn tư vấn (ví dụ: 30, 45 phút)."
                          FormHelperTextProps={{sx: {fontWeight: 500, color: "#64748b"}}}
                          inputProps={{readOnly: fieldDisabled, min: 0}}
                          fullWidth
                        />
                      </Box>
                      <Box sx={{minWidth: 0}}>
                        {useCampusConfigFlow ? (
                          <Stack direction="row" alignItems="center" spacing={1} sx={{mb: 0.5, minHeight: 24}}>
                            <HqScalarDiffChip
                              fieldKey="bufferBetweenSlotsMinutes"
                              effectiveOp={config.operationSettingsData}
                              hqOp={branchHqOperation}
                              hqMissing={campusHqOperationMissing}
                            />
                          </Stack>
                        ) : null}
                        <TextField
                          label="(*) Nghỉ giữa hai slot (phút)"
                          type="number"
                          value={
                            config.operationSettingsData.bufferBetweenSlotsMinutes === "" ||
                            config.operationSettingsData.bufferBetweenSlotsMinutes == null
                              ? ""
                              : config.operationSettingsData.bufferBetweenSlotsMinutes
                          }
                          onChange={(e) =>
                            setConfig((c) => ({
                              ...c,
                              operationSettingsData: {
                                ...c.operationSettingsData,
                                bufferBetweenSlotsMinutes:
                                  e.target.value === ""
                                    ? ""
                                    : Math.max(0, Number(e.target.value) || 0),
                              },
                            }))
                          }
                          size="small"
                          helperText="(*) Thời gian nghỉ giữa hai slot tư vấn liên tiếp (0 = không nghỉ). Bước giữa hai bắt đầu tiết = độ dài tiết + nghỉ"
                          FormHelperTextProps={{sx: {fontWeight: 500, color: "#64748b"}}}
                          inputProps={{readOnly: fieldDisabled, min: 0}}
                          fullWidth
                        />
                      </Box>
                      <Box sx={{minWidth: 0}}>
                        {useCampusConfigFlow ? (
                          <Stack direction="row" alignItems="center" spacing={1} sx={{mb: 0.5, minHeight: 24}}>
                            <HqScalarDiffChip
                              fieldKey="allowBookingBeforeHours"
                              effectiveOp={config.operationSettingsData}
                              hqOp={branchHqOperation}
                              hqMissing={campusHqOperationMissing}
                            />
                          </Stack>
                        ) : null}
                        <TextField
                          label="Đặt lịch trước (giờ)"
                          type="number"
                          value={
                            config.operationSettingsData.allowBookingBeforeHours === "" ||
                            config.operationSettingsData.allowBookingBeforeHours == null
                              ? ""
                              : config.operationSettingsData.allowBookingBeforeHours
                          }
                          onChange={(e) =>
                            setConfig((c) => ({
                              ...c,
                              operationSettingsData: {
                                ...c.operationSettingsData,
                                allowBookingBeforeHours: e.target.value === "" ? "" : Number(e.target.value) || 0,
                              },
                            }))
                          }
                          size="small"
                          helperText="(*) Thời gian tối thiểu phải đặt trước khi cuộc hẹn diễn ra"
                          FormHelperTextProps={{sx: {fontWeight: 500, color: "#64748b"}}}
                          inputProps={{readOnly: fieldDisabled, min: 0}}
                          fullWidth
                        />
                      </Box>
                    </Box>
                    {!useCampusConfigFlow ? (
                      <SchoolSlotCycleHint
                        slotMinutes={config.operationSettingsData.slotDurationInMinutes}
                        bufferMinutes={config.operationSettingsData.bufferBetweenSlotsMinutes}
                      />
                    ) : null}
                  </Stack>
                </CardContent>
              </Card>

              {useCampusConfigFlow ? (
                <SchoolWideScheduleReadOnlyPanel
                  workingConfig={config.operationSettingsData.workingConfig}
                  showSchoolOperationCta={isPrimaryBranch}
                />
              ) : (
              <Card sx={{borderRadius: "12px", border: "1px solid rgba(226,232,240,1)", boxShadow: "0 8px 24px rgba(15,23,42,0.06)"}}>
                <CardContent sx={{p: 3}}>
                  <Typography sx={{fontWeight: 800, mb: 2}}>Giờ làm việc</Typography>
                  <Typography variant="body2" sx={{mb: 1.25, color: "#64748b"}}>
                    Ngày trong tuần (regular / weekend)
                  </Typography>
                  <Stack
                    direction="row"
                    flexWrap="wrap"
                    useFlexGap
                    sx={{gap: 1.25, mb: 2, alignItems: "center"}}
                  >
                    <ToggleButtonGroup
                      exclusive={false}
                      value={config.operationSettingsData.workingConfig.regularDays || []}
                      onChange={(e, v) => {
                        if (fieldDisabled || !v) return;
                        setConfig((c) => ({
                          ...c,
                          operationSettingsData: {
                            ...c.operationSettingsData,
                            workingConfig: {...c.operationSettingsData.workingConfig, regularDays: v},
                          },
                        }));
                      }}
                      sx={{
                        flexWrap: "wrap",
                        gap: 1.25,
                        ...blockPointerSx,
                        "& .MuiToggleButton-root": {
                          textTransform: "none",
                          border: "1px solid #e2e8f0 !important",
                          borderRadius: "10px !important",
                          px: 1.75,
                          py: 0.75,
                          color: "#475569",
                          "&.Mui-selected": {
                            color: "#2563eb",
                            bgcolor: "rgba(37,99,235,0.08)",
                            borderColor: "#2563eb !important",
                          },
                        },
                        "& .MuiToggleButtonGroup-grouped": {
                          borderRadius: "10px !important",
                        },
                      }}
                    >
                      {DAY_CODES.slice(0, 5).map((d) => (
                        <ToggleButton key={d.code} value={d.code}>
                          {d.label}
                        </ToggleButton>
                      ))}
                    </ToggleButtonGroup>
                    <ToggleButtonGroup
                      exclusive={false}
                      value={config.operationSettingsData.workingConfig.weekendDays || []}
                      onChange={(e, v) => {
                        if (fieldDisabled || !v) return;
                        setConfig((c) => ({
                          ...c,
                          operationSettingsData: {
                            ...c.operationSettingsData,
                            workingConfig: {...c.operationSettingsData.workingConfig, weekendDays: v},
                          },
                        }));
                      }}
                      sx={{
                        flexWrap: "wrap",
                        gap: 1.25,
                        ...blockPointerSx,
                        "& .MuiToggleButton-root": {
                          textTransform: "none",
                          border: "1px solid #e2e8f0 !important",
                          borderRadius: "10px !important",
                          px: 1.75,
                          py: 0.75,
                          color: "#475569",
                          "&.Mui-selected": {
                            color: "#2563eb",
                            bgcolor: "rgba(37,99,235,0.08)",
                            borderColor: "#2563eb !important",
                          },
                        },
                        "& .MuiToggleButtonGroup-grouped": {
                          borderRadius: "10px !important",
                        },
                      }}
                    >
                      <ToggleButton value="SAT">T7</ToggleButton>
                    </ToggleButtonGroup>
                  </Stack>
                  <Box sx={{width: "100%", mt: 2}}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={Boolean(config.operationSettingsData.workingConfig.isOpenSunday)}
                          onChange={(e) => {
                            if (fieldDisabled) return;
                            setConfig((c) => ({
                              ...c,
                              operationSettingsData: {
                                ...c.operationSettingsData,
                                workingConfig: {...c.operationSettingsData.workingConfig, isOpenSunday: e.target.checked},
                              },
                            }));
                          }}
                          sx={blockPointerSx}
                        />
                      }
                      label="Mở Chủ nhật"
                      sx={{ml: 0, alignItems: "center"}}
                    />
                    </Box>
                  <TextField
                    label="Ghi chú lịch"
                    multiline
                    minRows={2}
                    value={config.operationSettingsData.workingConfig.note ?? ""}
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        operationSettingsData: {
                          ...c.operationSettingsData,
                          workingConfig: {...c.operationSettingsData.workingConfig, note: e.target.value},
                        },
                      }))
                    }
                    fullWidth
                    sx={{mt: 2}}
                    inputProps={{readOnly: fieldDisabled}}
                  />

                  <Typography sx={{fontWeight: 800, mt: 3, mb: 1.25}}>Ca làm việc (chuẩn trường)</Typography>
                  <Stack spacing={1}>
                    {(config.operationSettingsData.workingConfig.workShifts || []).map((sh, idx) => {
                      const code = canonicalizeWorkShiftName(sh.name);
                      const sel = WORK_SHIFT_TYPE_CODES.includes(code) ? code : "";
                      return (
                        <Box
                          key={idx}
                          sx={{
                            display: "grid",
                            gridTemplateColumns: {xs: "1fr", sm: "minmax(240px, 1.8fr) minmax(160px, 1fr) minmax(160px, 1fr) auto"},
                            gap: 1,
                            alignItems: "center",
                          }}
                        >
                          <FormControl size="small" fullWidth>
                            <InputLabel>Loại ca</InputLabel>
                            <Select
                              label="Loại ca"
                              value={sel}
                              onChange={(e) => {
                                const v = e.target.value;
                                setConfig((c) => {
                                  const ws = [...(c.operationSettingsData.workingConfig.workShifts || [])];
                                  ws[idx] = {...ws[idx], name: v};
                                  return {
                                    ...c,
                                    operationSettingsData: {
                                      ...c.operationSettingsData,
                                      workingConfig: {...c.operationSettingsData.workingConfig, workShifts: ws},
                                    },
                                  };
                                });
                              }}
                              disabled={fieldDisabled}
                            >
                              <MenuItem value="">
                                <em>Chọn loại ca</em>
                              </MenuItem>
                              {WORK_SHIFT_TYPE_CODES.map((k) => (
                                <MenuItem key={k} value={k}>
                                  {WORK_SHIFT_TYPE_LABEL_VI[k]} ({k})
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <TextField
                            label="Bắt đầu"
                            type="time"
                            size="small"
                            fullWidth
                            InputLabelProps={{shrink: true}}
                            value={sh.startTime ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setConfig((c) => {
                                const ws = [...(c.operationSettingsData.workingConfig.workShifts || [])];
                                ws[idx] = {...ws[idx], startTime: normalizeTimeHHmm(v) || v};
                                return {
                                  ...c,
                                  operationSettingsData: {
                                    ...c.operationSettingsData,
                                    workingConfig: {...c.operationSettingsData.workingConfig, workShifts: ws},
                                  },
                                };
                              });
                            }}
                            inputProps={{
                              readOnly: fieldDisabled,
                              ...(sel && WORK_SHIFT_TIME_WINDOWS[sel]
                                ? {min: WORK_SHIFT_TIME_WINDOWS[sel].min, max: WORK_SHIFT_TIME_WINDOWS[sel].max}
                                : {}),
                            }}
                          />
                          <TextField
                            label="Kết thúc"
                            type="time"
                            size="small"
                            fullWidth
                            InputLabelProps={{shrink: true}}
                            value={sh.endTime ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setConfig((c) => {
                                const ws = [...(c.operationSettingsData.workingConfig.workShifts || [])];
                                ws[idx] = {...ws[idx], endTime: normalizeTimeHHmm(v) || v};
                                return {
                                  ...c,
                                  operationSettingsData: {
                                    ...c.operationSettingsData,
                                    workingConfig: {...c.operationSettingsData.workingConfig, workShifts: ws},
                                  },
                                };
                              });
                            }}
                            inputProps={{
                              readOnly: fieldDisabled,
                              ...(sel && WORK_SHIFT_TIME_WINDOWS[sel]
                                ? {min: WORK_SHIFT_TIME_WINDOWS[sel].min, max: WORK_SHIFT_TIME_WINDOWS[sel].max}
                                : {}),
                            }}
                          />
                          <IconButton
                            size="small"
                            color="error"
                            aria-label="Xoá ca làm việc"
                            disabled={fieldDisabled}
                            onClick={() =>
                              setConfig((c) => {
                                const ws = [...(c.operationSettingsData.workingConfig.workShifts || [])];
                                ws.splice(idx, 1);
                                return {
                                  ...c,
                                  operationSettingsData: {
                                    ...c.operationSettingsData,
                                    workingConfig: {...c.operationSettingsData.workingConfig, workShifts: ws},
                                  },
                                };
                              })
                            }
                            sx={{...blockPointerSx, justifySelf: {xs: "end", sm: "center"}}}
                          >
                            <DeleteOutlineIcon fontSize="small"/>
                          </IconButton>
                        </Box>
                      );
                    })}
                    <Button
                      startIcon={<AddIcon/>}
                      disabled={fieldDisabled}
                      onClick={() =>
                        setConfig((c) => {
                          const ws = [
                            ...(c.operationSettingsData.workingConfig.workShifts || []),
                            {name: "MORNING", startTime: "07:00", endTime: "11:30"},
                          ];
                          return {
                            ...c,
                            operationSettingsData: {
                              ...c.operationSettingsData,
                              workingConfig: {...c.operationSettingsData.workingConfig, workShifts: ws},
                            },
                          };
                        })
                      }
                      sx={{textTransform: "none", alignSelf: "flex-start", ...blockPointerSx}}
                    >
                      Thêm ca
                    </Button>
                  </Stack>
        </CardContent>
      </Card>
              )}

              <Card sx={{borderRadius: "12px", border: "1px solid rgba(226,232,240,1)", boxShadow: "0 8px 24px rgba(15,23,42,0.06)"}}>
                <CardContent sx={{p: 3}}>
                  <Alert severity="info" sx={{mb: 2, borderRadius: 2}}>
                    <Typography variant="body2" sx={{fontWeight: 700, mb: 0.5}}>
                      Ghi đè theo mùa tuyển sinh
                    </Typography>
                    <Typography variant="body2" component="div" sx={{lineHeight: 1.65}}>
                      Tránh phải sửa đi sửa lại &quot;giờ làm mặc định&quot; cả năm rồi trả về như cũ sau mùa cao điểm. Mỗi chiến dịch chỉ
                      có hiệu lực trong khoảng ngày đã chọn; hết thời gian đó, hệ thống tự áp dụng lại quy tắc nền. Trong từng mùa có
                      thể bật lịch Chủ nhật, thêm ca tối và tăng hệ số nhân sự so với ngày thường.
                    </Typography>
                  </Alert>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} mb={1} flexWrap="wrap">
                    <Box sx={{flex: 1, minWidth: 220}}>
                      <Typography sx={{fontWeight: 800}}>Chiến dịch / mùa tuyển sinh</Typography>
                      <Typography variant="body2" sx={{color: "text.secondary", mt: 0.75}}>
                        Mặc định dùng <strong>giờ làm tiêu chuẩn</strong> ở phần cấu hình phía trên. Chỉ thêm chiến dịch khi cần quy tắc
                        riêng cho một khoảng thời gian (ví dụ tháng 6–7). Khi bạn nhấn <strong>Lưu thay đổi</strong>, các mùa này được
                        gửi cùng dữ liệu cấu hình vận hành của trường.
                      </Typography>
                    </Box>
                    <Button startIcon={<AddIcon/>} disabled={fieldDisabled} onClick={addAdmissionSeason} sx={{textTransform: "none", flexShrink: 0, ...blockPointerSx}}>
                      Thêm chiến dịch
                    </Button>
                  </Stack>
                  <Stack spacing={2.5}>
                    {(config.operationSettingsData.admissionSeasons || []).length === 0 ? (
                      <Paper variant="outlined" sx={{p: 2.5, borderStyle: "dashed", color: "text.secondary", borderRadius: 2}}>
                        Chưa có chiến dịch. Toàn bộ lịch trống cho phụ huynh vẫn theo <strong>giờ làm tiêu chuẩn</strong>. Nhấn &quot;Thêm
                        chiến dịch&quot; để thiết lập khoảng thời gian đặc biệt.
                      </Paper>
                    ) : null}
                    {(config.operationSettingsData.admissionSeasons || []).map((season, si) => {
                      const status = admissionSeasonStatusMeta(season.startDate, season.endDate);
                      const title = (season.seasonName && String(season.seasonName).trim()) || `Chiến dịch ${si + 1}`;
                      const baseMin = Math.max(1, Number(config.operationSettingsData.minCounsellorPerSlot) || 1);
                      const mult = Math.max(
                        1,
                        season.minCounsellorMultiplier === "" || season.minCounsellorMultiplier == null
                          ? 1
                          : Number(season.minCounsellorMultiplier) || 1
                      );
                      const exAfter = baseMin * mult;
                      return (
                        <Paper
                          key={`admission-season-${si}`}
                          elevation={0}
                          sx={{
                            p: 2.5,
                            borderRadius: 2,
                            border: "1px solid",
                            borderColor: "divider",
                            bgcolor: "#fafafa",
                          }}
                        >
                          <Stack spacing={2}>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1} flexWrap="wrap">
                              <Box sx={{minWidth: 0}}>
                                <Typography sx={{fontWeight: 800, fontSize: "1.05rem", lineHeight: 1.35}}>{title}</Typography>
                                <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" sx={{mt: 0.75}}>
                                  <Chip size="small" label={status.label} color={status.color} sx={{fontWeight: 700}}/>
                                  <Typography variant="body2" sx={{color: "primary.main", fontWeight: 700}}>
                                    {formatViDateFromYmd(season.startDate) && formatViDateFromYmd(season.endDate)
                                      ? `${formatViDateFromYmd(season.startDate)} — ${formatViDateFromYmd(season.endDate)}`
                                      : "Chọn khoảng ngày để xem trạng thái"}
                                  </Typography>
                                </Stack>
                              </Box>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => removeAdmissionSeasonAt(si)}
                                aria-label="Xóa chiến dịch"
                                sx={blockPointerSx}
                              >
                                <DeleteOutlineIcon fontSize="small"/>
                              </IconButton>
                            </Stack>

                            <TextField
                              label="Tên chiến dịch"
                              size="small"
                              placeholder="vd. Tuyển sinh lớp 10 cao điểm"
                              value={season.seasonName ?? ""}
                              onChange={(e) => updateAdmissionSeasonAt(si, {seasonName: e.target.value})}
                              inputProps={{readOnly: fieldDisabled}}
                              fullWidth
                            />

                            <Stack
                              direction={{xs: "column", sm: "row"}}
                              spacing={2}
                              sx={{
                                p: 2,
                                borderRadius: 2,
                                bgcolor: "background.paper",
                                border: "1px solid",
                                borderColor: "divider",
                              }}
                            >
                              <TextField
                                label="Ngày bắt đầu"
                                type="date"
                                size="small"
                                InputLabelProps={{shrink: true}}
                                value={season.startDate ?? ""}
                                onChange={(e) => updateAdmissionSeasonAt(si, {startDate: e.target.value})}
                                inputProps={{readOnly: fieldDisabled}}
                                fullWidth
                              />
                              <TextField
                                label="Ngày kết thúc"
                                type="date"
                                size="small"
                                InputLabelProps={{shrink: true}}
                                value={season.endDate ?? ""}
                                onChange={(e) => updateAdmissionSeasonAt(si, {endDate: e.target.value})}
                                inputProps={{readOnly: fieldDisabled}}
                                fullWidth
                              />
                            </Stack>

                            <Paper variant="outlined" sx={{p: 2, borderRadius: 2, borderColor: "divider", bgcolor: "#fff"}}>
                              <FormControlLabel
                                sx={{m: 0, alignItems: "flex-start", width: "100%"}}
                                control={
                                  <Switch
                                    size="medium"
                                    checked={Boolean(season.enableSunday)}
                                    onChange={(e) => updateAdmissionSeasonAt(si, {enableSunday: e.target.checked})}
                                    disabled={fieldDisabled}
                                    sx={{mt: 0.25}}
                                  />
                                }
                                label={
                                  <Box>
                                    <Typography sx={{fontWeight: 700}}>Mở lịch Chủ nhật trong mùa này</Typography>
                                    <Typography variant="body2" sx={{color: "text.secondary", mt: 0.25, lineHeight: 1.55}}>
                                      Cho phép phụ huynh đặt lịch vào Chủ nhật chỉ trong khoảng thời gian chiến dịch — không ảnh hưởng các
                                      ngày ngoài mùa.
                                    </Typography>
                                  </Box>
                                }
                              />
                            </Paper>

                            <Box>
                              <TextField
                                label="Hệ số nhân lực (nhân với mức tối thiểu mỗi ca)"
                                type="number"
                                size="small"
                                inputProps={{min: 1, readOnly: fieldDisabled}}
                                value={
                                  season.minCounsellorMultiplier === "" || season.minCounsellorMultiplier == null
                                    ? ""
                                    : season.minCounsellorMultiplier
                                }
                                onChange={(e) =>
                                  updateAdmissionSeasonAt(si, {
                                    minCounsellorMultiplier:
                                      e.target.value === "" ? "" : Number(e.target.value) || 1,
                                  })
                                }
                                sx={{maxWidth: {sm: 320}}}
                                helperText={`Ví dụ: quy tắc nền yêu cầu tối thiểu ${baseMin} tư vấn viên mỗi ca; trong mùa này hệ số nhân ${mult} nên hệ thống yêu cầu ít nhất ${exAfter} tư vấn viên mỗi ca.`}
                                FormHelperTextProps={{sx: {maxWidth: 560, lineHeight: 1.5}}}
                              />
                            </Box>

                            <TextField
                              label="Ghi chú nội bộ"
                              size="small"
                              multiline
                              minRows={2}
                              placeholder="vd. Tăng cường gấp đôi nhân sự hỗ trợ"
                              value={season.note ?? ""}
                              onChange={(e) => updateAdmissionSeasonAt(si, {note: e.target.value})}
                              inputProps={{readOnly: fieldDisabled}}
                              fullWidth
                            />

                            <Box
                              sx={{
                                p: 2,
                                borderRadius: 2,
                                border: "1px solid",
                                borderColor: "rgba(234, 88, 12, 0.35)",
                                bgcolor: "rgba(234, 88, 12, 0.06)",
                              }}
                            >
                              <Typography sx={{fontWeight: 800, mb: 1, color: "#c2410c"}}>
                                Ca làm việc tăng cường
                              </Typography>
                              <Typography variant="body2" sx={{color: "text.secondary", mb: 1.5, lineHeight: 1.55}}>
                                Cùng quy tắc loại ca và khung giờ như ca chuẩn ở trên.
                              </Typography>
                              <Stack spacing={1.25}>
                                {(season.extraShifts || []).map((sh, ei) => {
                                  const code = canonicalizeWorkShiftName(sh.name);
                                  const sel = WORK_SHIFT_TYPE_CODES.includes(code) ? code : "";
                                  return (
                                  <Stack
                                    key={`season-${si}-shift-${ei}`}
                                    direction={{xs: "column", md: "row"}}
                                    spacing={1}
                                    alignItems={{md: "flex-start"}}
                                    sx={{
                                      p: 1.25,
                                      borderRadius: 1.5,
                                      bgcolor: "background.paper",
                                      border: "1px solid rgba(37, 99, 235, 0.22)",
                                    }}
                                  >
                                    <FormControl size="small" sx={{minWidth: 200, flex: 1}}>
                                      <InputLabel>Loại ca</InputLabel>
                                      <Select
                                        label="Loại ca"
                                        value={sel}
                                        onChange={(e) => updateExtraShiftInAdmissionSeason(si, ei, "name", e.target.value)}
                                        disabled={fieldDisabled}
                                      >
                                        <MenuItem value="">
                                          <em>Chọn</em>
                                        </MenuItem>
                                        {WORK_SHIFT_TYPE_CODES.map((k) => (
                                          <MenuItem key={k} value={k}>
                                            {WORK_SHIFT_TYPE_LABEL_VI[k]} ({k})
                                          </MenuItem>
                                        ))}
                                      </Select>
                                    </FormControl>
                                    <TextField
                                      label="Bắt đầu"
                                      size="small"
                                      type="time"
                                      InputLabelProps={{shrink: true}}
                                      value={sh.startTime ?? ""}
                                      onChange={(e) =>
                                        updateExtraShiftInAdmissionSeason(
                                          si,
                                          ei,
                                          "startTime",
                                          normalizeTimeHHmm(e.target.value) || e.target.value
                                        )
                                      }
                                      inputProps={{
                                        readOnly: fieldDisabled,
                                        ...(sel && WORK_SHIFT_TIME_WINDOWS[sel]
                                          ? {min: WORK_SHIFT_TIME_WINDOWS[sel].min, max: WORK_SHIFT_TIME_WINDOWS[sel].max}
                                          : {}),
                                      }}
                                    />
                                    <TextField
                                      label="Kết thúc"
                                      size="small"
                                      type="time"
                                      InputLabelProps={{shrink: true}}
                                      value={sh.endTime ?? ""}
                                      onChange={(e) =>
                                        updateExtraShiftInAdmissionSeason(
                                          si,
                                          ei,
                                          "endTime",
                                          normalizeTimeHHmm(e.target.value) || e.target.value
                                        )
                                      }
                                      inputProps={{
                                        readOnly: fieldDisabled,
                                        ...(sel && WORK_SHIFT_TIME_WINDOWS[sel]
                                          ? {min: WORK_SHIFT_TIME_WINDOWS[sel].min, max: WORK_SHIFT_TIME_WINDOWS[sel].max}
                                          : {}),
                                      }}
                                    />
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => removeExtraShiftFromAdmissionSeason(si, ei)}
                                      aria-label="Xóa ca"
                                      sx={blockPointerSx}
                                    >
                                      <DeleteOutlineIcon fontSize="small"/>
                                    </IconButton>
                                  </Stack>
                                  );
                                })}
                              </Stack>
                              <Button
                                size="small"
                                variant="outlined"
                                color="warning"
                                startIcon={<AddIcon/>}
                                disabled={fieldDisabled}
                                onClick={() => addExtraShiftToAdmissionSeason(si)}
                                sx={{textTransform: "none", alignSelf: "flex-start", mt: 1.5, ...blockPointerSx}}
                              >
                                Thêm ca tăng cường
                              </Button>
                            </Box>
                          </Stack>
                        </Paper>
                      );
                    })}
                  </Stack>
                </CardContent>
              </Card>

              {useCampusConfigFlow ? (
                <Card
                  sx={{
                    borderRadius: "12px",
                    border: "1px solid rgba(226,232,240,1)",
                    boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
                  }}
                >
                  <CardContent sx={{p: 3}}>
                    <Typography sx={{fontWeight: 800, mb: 2}}>Quy định tại cơ sở</Typography>
                    <TextField
                      label="Chi tiết quy định (ghi chú riêng)"
                      multiline
                      minRows={3}
                      fullWidth
                      value={branchPolicyDetail}
                      onChange={(e) => setBranchPolicyDetail(e.target.value)}
                      inputProps={{readOnly: fieldDisabled}}
                      FormHelperTextProps={{sx: {maxWidth: "100%"}}}
                    />
                  </CardContent>
                </Card>
              ) : null}
            </Stack>
          )}

          {showFacilityTab && (
            <SchoolFacilityFacilityForm
              ref={facilityFormRef}
              value={config.facilityData}
              onChange={(next) => setConfig((c) => ({...c, facilityData: next}))}
              loading={loading}
              saving={saving}
              readOnly={fieldDisabled}
              perCampus={useCampusConfigFlow}
            />
          )}

          {showResourceDistributionTab && (
            <Card sx={{borderRadius: "12px", border: "1px solid rgba(226,232,240,1)", boxShadow: "0 8px 24px rgba(15,23,42,0.06)"}}>
              <CardContent sx={{p: 3}}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{mb: 2}}>
                  <Box>
                    <Typography sx={{fontWeight: 800, fontSize: 18}}>Phân bổ nguồn lực</Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon/>}
                    disabled={fieldDisabled}
                    onClick={addResourceAllocation}
                    sx={{textTransform: "none", fontWeight: 700, borderRadius: 2, ...blockPointerSx}}
                  >
                    Thêm dòng
                  </Button>
                </Stack>

                {(config.resourceDistributionData?.allocations || []).length === 0 ? (
                  <Paper variant="outlined" sx={{p: 2, borderStyle: "dashed", color: "#64748b"}}>
                    Chưa có dữ liệu phân bổ. Nhấn "Thêm dòng" để tạo mới.
                  </Paper>
                ) : (
                  <Stack spacing={1.25}>
                    {(config.resourceDistributionData?.allocations || []).map((row, idx) => {
                      const rowCampusId =
                        row.campusId != null && !Number.isNaN(Number(row.campusId)) ? Number(row.campusId) : null;
                      const campusInList =
                        rowCampusId != null &&
                        campusList.some((c) => {
                          const id = campusKey(c);
                          return id != null && Number(id) === rowCampusId;
                        });
                      return (
                      <Card key={`resource-allocation-${idx}`} variant="outlined" sx={{borderRadius: 2}}>
                        <CardContent sx={{py: 1.5}}>
                          <Stack direction={{xs: "column", md: "row"}} spacing={1.25} alignItems={{xs: "stretch", md: "center"}}>
                            <TextField
                              label="Loại nguồn lực"
                              size="small"
                              value={RESOURCE_TYPE_OPTIONS[0]?.label ?? ""}
                              sx={{flex: 1, minWidth: {md: 200}}}
                              InputProps={{readOnly: true}}
                              disabled={fieldDisabled}
                            />
                            <TextField
                              select
                              label="Cơ sở"
                              size="small"
                              value={row.campusId != null && !Number.isNaN(Number(row.campusId)) ? String(Number(row.campusId)) : ""}
                              onChange={(e) => {
                                const raw = e.target.value;
                                updateResourceAllocationAt(idx, {campusId: raw === "" ? null : Number(raw)});
                              }}
                              sx={{width: {xs: "100%", md: 220}}}
                              inputProps={{readOnly: fieldDisabled}}
                            >
                              <MenuItem value="">
                                <em>Chọn cơ sở</em>
                              </MenuItem>
                              {rowCampusId != null && !campusInList ? (
                                <MenuItem value={String(rowCampusId)}>
                                  Cơ sở #{rowCampusId} (không có trong danh sách)
                                </MenuItem>
                              ) : null}
                              {campusList.map((c) => {
                                const id = campusKey(c);
                                if (id == null || id === "") return null;
                                const n = Number(id);
                                const label = c?.name ?? c?.campusName ?? `Cơ sở #${id}`;
                                return (
                                  <MenuItem key={String(id)} value={Number.isFinite(n) ? String(n) : String(id)}>
                                    {label}
                                  </MenuItem>
                                );
                              })}
                            </TextField>
                            <TextField
                              label="Số lượng phân bổ"
                              size="small"
                              type="number"
                              value={row.allocatedAmount === "" || row.allocatedAmount == null ? "" : row.allocatedAmount}
                              onChange={(e) =>
                                updateResourceAllocationAt(idx, {
                                  allocatedAmount: e.target.value === "" ? "" : Number(e.target.value) || 0,
                                })
                              }
                              sx={{width: {xs: "100%", md: 200}}}
                              inputProps={{readOnly: fieldDisabled, min: 0}}
                            />
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => removeResourceAllocationAt(idx)}
                              aria-label="Xoá dòng phân bổ"
                              sx={{alignSelf: {xs: "flex-end", md: "center"}, ...blockPointerSx}}
                            >
                              <DeleteOutlineIcon fontSize="small"/>
                            </IconButton>
                          </Stack>
                        </CardContent>
                      </Card>
                      );
                    })}
                  </Stack>
                )}

                <Divider sx={{my: 2.5}}/>
                <Typography
                  sx={{
                    fontSize: "0.8125rem",
                    fontWeight: 700,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    mb: 1.5,
                  }}
                >
                  Báo cáo tài nguyên tổng thể
                </Typography>
                {resourceSummaryLoading ? (
                  <LinearProgress sx={{borderRadius: 1, height: 8}}/>
                ) : resourceSummaryReport ? (
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {xs: "1fr", sm: "repeat(3, minmax(0, 1fr))"},
                      gap: 2,
                      width: "100%",
                    }}
                  >
                    {[
                      {label: "Tổng tài nguyên hiện có", value: resourceSummaryReport.totalPackageQuota, accent: "#0D64DE"},
                      {label: "Tài nguyên của cơ sở chính hiện có", value: resourceSummaryReport.myCampusQuota, accent: "#047857"},
                      {label: "Tài nguyên của các chi nhánh hiện có", value: resourceSummaryReport.otherCampusesQuota, accent: "#b45309"},
                    ].map((item) => (
                      <Box
                        key={item.label}
                        sx={{
                          borderRadius: 2,
                          border: "1px solid #e2e8f0",
                          p: 2,
                          bgcolor: "#fff",
                          boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            color: "#94a3b8",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {item.label}
                        </Typography>
                        <Typography sx={{fontSize: "1.75rem", fontWeight: 800, color: item.accent, lineHeight: 1.1, mt: 0.6}}>
                          {item.value}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" sx={{color: "#64748b"}}>
                    Chưa có dữ liệu tài nguyên tổng thể từ gói dịch vụ hiện tại.
                  </Typography>
                )}
              </CardContent>
            </Card>
          )}
            </>
          )}
        </Box>

        <Box sx={{mt: 2, display: "flex", justifyContent: "flex-end", gap: 1, flexWrap: "wrap"}}>
          {!editing ? (
            <Button
              variant="contained"
              onClick={() => setEditing(true)}
              disabled={loading || saving || schoolCtxLoading || (isCampusVariant && !useCampusConfigFlow)}
              sx={footerSaveSx}
            >
              Chỉnh sửa
            </Button>
          ) : (
            <>
              <Button variant="outlined" onClick={handleReset} disabled={loading || saving || schoolCtxLoading} sx={footerCancelSx}>
                Huỷ
              </Button>
              <Button variant="contained" onClick={handleSave} disabled={loading || saving || schoolCtxLoading || !isDirty} sx={footerSaveSx}>
                {saving ? <CircularProgress size={18} sx={{color: "white", mr: 1}}/> : null}
                Lưu thay đổi
              </Button>
            </>
          )}
        </Box>

        <Dialog open={admissionRestoreConfirmOpen} onClose={() => setAdmissionRestoreConfirmOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{fontWeight: 800}}>Khôi phục mẫu hệ thống</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">
              Bạn có thay đổi chưa lưu. Tiếp tục sẽ ghi đè form hiện tại bằng mẫu từ hệ thống (chưa ghi DB cho đến khi bạn Lưu).
            </Typography>
          </DialogContent>
          <DialogActions sx={{px: 3, pb: 2}}>
            <Button onClick={() => setAdmissionRestoreConfirmOpen(false)} sx={{textTransform: "none", fontWeight: 700}}>
              Huỷ
            </Button>
            <Button
              variant="contained"
              color="warning"
              onClick={() => {
                setAdmissionRestoreConfirmOpen(false);
                if (restoreTemplateTarget === "documents") {
                  void applySystemDocumentTemplateToForm();
                  return;
                }
                void applySystemTemplateToForm();
              }}
              sx={{textTransform: "none", fontWeight: 700}}
            >
              Tiếp tục
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={admissionToggleOffConfirm.open} onClose={() => setAdmissionToggleOffConfirm({open: false, code: ""})} maxWidth="sm" fullWidth>
          <DialogTitle sx={{fontWeight: 800}}>Bỏ bật phương thức</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">
              Mã <strong>{admissionToggleOffConfirm.code}</strong> đang được dùng ở cấu hình hồ sơ hoặc quy trình. Bỏ bật có thể khiến các phần đó cần cập nhật lại.
            </Typography>
          </DialogContent>
          <DialogActions sx={{px: 3, pb: 2}}>
            <Button onClick={() => setAdmissionToggleOffConfirm({open: false, code: ""})} sx={{textTransform: "none", fontWeight: 700}}>
              Huỷ
            </Button>
            <Button variant="contained" color="warning" onClick={confirmToggleAdmissionOff} sx={{textTransform: "none", fontWeight: 700}}>
              Vẫn bỏ bật
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={admissionRemoveRowConfirm.open} onClose={() => setAdmissionRemoveRowConfirm({open: false, idx: -1})} maxWidth="sm" fullWidth>
          <DialogTitle sx={{fontWeight: 800}}>Xoá dòng phương thức</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">
              Các cấu hình đang trỏ tới mã này (hoặc mã tương ứng) có thể cần cập nhật. Bạn có chắc muốn xoá dòng này?
            </Typography>
          </DialogContent>
          <DialogActions sx={{px: 3, pb: 2}}>
            <Button onClick={() => setAdmissionRemoveRowConfirm({open: false, idx: -1})} sx={{textTransform: "none", fontWeight: 700}}>
              Huỷ
            </Button>
            <Button variant="contained" color="error" onClick={confirmRemoveAdmissionRow} sx={{textTransform: "none", fontWeight: 700}}>
              Xoá
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={mandatoryImportDialogOpen}
          onClose={closeMandatoryImportDialog}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
            },
          }}
        >
          <DialogTitle sx={{fontWeight: 800}}>Import hồ sơ bắt buộc</DialogTitle>
          <DialogContent dividers sx={{p: 0}}>
            {mandatoryImportLoading ? (
              <Stack alignItems="center" justifyContent="center" spacing={2} sx={{minHeight: 280}}>
                <CircularProgress/>
                <Typography variant="body2" color="text.secondary">Đang đọc file...</Typography>
              </Stack>
            ) : (
              <Stack spacing={2} sx={{p: 2.5}}>
                <Typography variant="body2" color="text.secondary">
                  Tải file Excel để hệ thống kiểm tra và nhập dữ liệu. Bạn có thể chỉnh sửa trực tiếp trên bảng nếu có lỗi.
                </Typography>

                <Box
                  sx={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 2,
                    maxHeight: 480,
                    overflow: "auto",
                  }}
                >
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{minWidth: 64}}>STT</TableCell>
                        <TableCell sx={{minWidth: 170}}>Mã hồ sơ</TableCell>
                        <TableCell>Tên hồ sơ</TableCell>
                        <TableCell sx={{minWidth: 120}}>Bắt buộc</TableCell>
                        <TableCell sx={{minWidth: 120}}>Trạng thái</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {mandatoryImportRows.map((row) => {
                        const rowErrorText = mandatoryImportRowErrorText(row);
                        const codeError = mandatoryImportFieldErrorText(row, "code");
                        const nameError = mandatoryImportFieldErrorText(row, "name");
                        return (
                          <TableRow
                            key={row._key}
                            sx={{
                              bgcolor: row.isError ? "#FFF1F0" : "#fff",
                              "& td:first-of-type": {
                                borderLeft: row.isError ? "3px solid #FF4D4F" : "3px solid transparent",
                              },
                              transition: "background-color 0.2s ease",
                            }}
                          >
                            <TableCell>{row.rowData?.index ?? "-"}</TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                value={row.rowData?.code ?? ""}
                                onChange={(e) => updateMandatoryImportRowCell(row._key, "code", e.target.value)}
                                error={Boolean(codeError)}
                                helperText={codeError || " "}
                                fullWidth
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                value={row.rowData?.name ?? ""}
                                onChange={(e) => updateMandatoryImportRowCell(row._key, "name", e.target.value)}
                                error={Boolean(nameError)}
                                helperText={nameError || " "}
                                fullWidth
                              />
                            </TableCell>
                            <TableCell>
                              <Checkbox checked disabled/>
                            </TableCell>
                            <TableCell>
                              {row._isValidating ? (
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <CircularProgress size={14}/>
                                  <Typography variant="caption" color="text.secondary">Đang kiểm tra</Typography>
                                </Stack>
                              ) : row.isError ? (
                                <Tooltip title={rowErrorText || "Dòng dữ liệu chưa hợp lệ"}>
                                  <Stack direction="row" spacing={0.75} alignItems="center" sx={{color: "#FF4D4F"}}>
                                    <ErrorOutlineIcon fontSize="small"/>
                                    <Typography variant="caption" sx={{fontWeight: 700}}>Lỗi</Typography>
                                  </Stack>
                                </Tooltip>
                              ) : (
                                <Stack direction="row" spacing={0.75} alignItems="center" sx={{color: "#52C41A"}}>
                                  <CheckCircleOutlineIcon fontSize="small"/>
                                  <Typography variant="caption" sx={{fontWeight: 700}}>Hợp lệ</Typography>
                                </Stack>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Box>

                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    Tổng số dòng: <strong>{mandatoryImportRows.length}</strong> | Dòng lỗi:{" "}
                    <Box component="span" sx={{color: mandatoryImportErrorCount > 0 ? "#FF4D4F" : "inherit", fontWeight: 700}}>
                      {mandatoryImportErrorCount}
                    </Box>
                  </Typography>
                  {mandatoryImportValidatingCount > 0 ? (
                    <Typography variant="caption" color="text.secondary">
                      Đang validate {mandatoryImportValidatingCount} dòng...
                    </Typography>
                  ) : null}
                </Stack>
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{px: 3, py: 2}}>
            <Button onClick={closeMandatoryImportDialog} disabled={mandatoryImportConfirming} sx={{textTransform: "none", fontWeight: 700}}>
              Huỷ
            </Button>
            <Button
              variant="contained"
              onClick={confirmMandatoryImportRows}
              disabled={mandatoryImportHasAnyError || mandatoryImportLoading || mandatoryImportConfirming || !mandatoryImportRows.length}
              sx={{textTransform: "none", fontWeight: 700}}
            >
              {mandatoryImportConfirming ? <CircularProgress size={16} sx={{mr: 1, color: "#fff"}}/> : null}
              Lưu dữ liệu
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Box>
  );
}
