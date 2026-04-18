import React, {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from "react";
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
  Typography,
} from "@mui/material";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import {useNavigate, useSearchParams} from "react-router-dom";
import {enqueueSnackbar} from "notistack";

import {extractCampusListBody, listCampuses} from "../../../services/CampusService.jsx";
import {useSchool} from "../../../contexts/SchoolContext.jsx";
import {
  getCampusConfig,
  getSchoolConfig,
  parseSchoolConfigResponseBody,
  updateCampusConfig,
  updateSchoolConfig,
} from "../../../services/SchoolFacilityService.jsx";
import {SchoolFacilityFacilityForm} from "./SchoolFacilityConfiguration.jsx";
import SchoolWideScheduleReadOnlyPanel from "./SchoolWideScheduleReadOnlyPanel.jsx";
import {resolveSchoolWideWorkingConfigDisplay} from "../../../utils/schoolWideWorkingConfig.js";

const TAB_SLUGS = ["admission", "documents", "operation", "finance", "facility", "quota", "resource-distribution"];
const TAB_LABELS = [
  "Cài Đặt Tuyển Sinh",
  "Cài Đặt Hồ Sơ",
  "Cài Đặt Vận Hành",
  "Cài Đặt Tài Chính",
  "Cài Đặt Cơ Sở Vật Chất",
  "Cài Đặt Chỉ Tiêu",
  "Phân Bổ Nguồn Lực",
];

/** Cấu hình của tôi: vận hành + CSVC (GET/PUT /campus/{id}/config). Ngày nghỉ: /school/holiday-settings. */
const BRANCH_TAB_SLUGS = ["operation", "facility"];
const BRANCH_TAB_LABELS = ["Cài Đặt Vận Hành", "Cài Đặt Cơ Sở Vật Chất"];

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
      slotDurationInMinutes: 30,
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
      /** GET `admissionProcesses` / PUT `methodAdmissionProcess` — quy trình theo từng methodCode */
      methodAdmissionProcess: [],
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

function normalizeAcademicDate(value) {
  if (value == null) return "";
  if (Array.isArray(value) && value.length >= 3) {
    const [y, m, d] = value;
    if (Number.isFinite(Number(y)) && Number.isFinite(Number(m)) && Number.isFinite(Number(d))) {
      const pad = (n) => String(n).padStart(2, "0");
      return `${Number(y)}-${pad(Number(m))}-${pad(Number(d))}`;
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

function normalizeAcademicCalendar(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  return {
    term1: normalizeAcademicTerm(src.term1),
    term2: normalizeAcademicTerm(src.term2),
  };
}

function hasAnyAcademicCalendarValue(cal) {
  if (!cal || typeof cal !== "object") return false;
  const t1 = cal.term1 && typeof cal.term1 === "object" ? cal.term1 : {};
  const t2 = cal.term2 && typeof cal.term2 === "object" ? cal.term2 : {};
  return Boolean(t1.start || t1.end || t2.start || t2.end);
}

function normalizeSeasonExtraShift(s) {
  if (!s || typeof s !== "object") return {name: "", startTime: "", endTime: ""};
  return {
    name: s.name != null ? String(s.name) : "",
    startTime: s.startTime != null ? String(s.startTime) : "",
    endTime: s.endTime != null ? String(s.endTime) : "",
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

function normalizeAcademicCalendarFromApi(raw, fallback) {
  const fb = fallback && typeof fallback === "object" ? fallback : {term1: {start: "", end: ""}, term2: {start: "", end: ""}};
  const src = raw && typeof raw === "object" ? raw : {};
  return {
    term1: {
      start: normalizeAcademicDate(src.term1?.start) || fb.term1?.start || "",
      end: normalizeAcademicDate(src.term1?.end) || fb.term1?.end || "",
    },
    term2: {
      start: normalizeAcademicDate(src.term2?.start) || fb.term2?.start || "",
      end: normalizeAcademicDate(src.term2?.end) || fb.term2?.end || "",
    },
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
        return {code: x.code.trim(), name: x.name.trim(), required: x.required};
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

/** PUT: bỏ field lạ (vd. itemList: true từ GET key), giữ đúng contract */
function sanitizeAdmissionSettingsForApi(adm) {
  if (!adm || typeof adm !== "object") return adm;
  const raw = Array.isArray(adm.allowedMethods) ? adm.allowedMethods : [];
  const normalized = raw.map((m) => {
    const {__isNewRow: _r, ...rest} = m && typeof m === "object" ? m : {};
    return {
      code: String(rest?.code ?? "").trim(),
      description: rest?.description != null ? String(rest.description) : "",
      displayName: rest?.displayName != null ? String(rest.displayName) : "",
    };
  });
  const withCode = normalized.filter((m) => m.code);
  const seen = new Set();
  const methods = [];
  for (let i = withCode.length - 1; i >= 0; i--) {
    if (seen.has(withCode[i].code)) continue;
    seen.add(withCode[i].code);
    methods.unshift(withCode[i]);
  }
  return {
    allowedMethods: methods,
    autoCloseOnFull: typeof adm.autoCloseOnFull === "boolean" ? adm.autoCloseOnFull : true,
    quotaAlertThresholdPercent:
      adm.quotaAlertThresholdPercent != null && !Number.isNaN(Number(adm.quotaAlertThresholdPercent))
        ? Number(adm.quotaAlertThresholdPercent)
        : 90,
  };
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
  const shifts = Array.isArray(wc.workShifts)
    ? wc.workShifts.map((s) => ({
        name: s.name != null ? String(s.name) : "",
        startTime: s.startTime != null ? String(s.startTime) : "",
        endTime: s.endTime != null ? String(s.endTime) : "",
      }))
    : [];
  const numOr = (v, fallback) =>
    v != null && !Number.isNaN(Number(v)) ? Number(v) : fallback;

  const openSunday = Boolean(wc.isOpenSunday ?? wc.openSunday);

  const methodAdmissionProcess = Array.isArray(op.methodAdmissionProcess)
    ? op.methodAdmissionProcess
        .map((g) => {
          const ng = normalizeMethodAdmissionProcessGroup(g);
          const steps = ng.steps.map((s, i) => ({
            stepName: s.stepName != null ? String(s.stepName) : "",
            stepOrder: s.stepOrder != null ? Number(s.stepOrder) : i + 1,
            description: s.description != null ? String(s.description) : "",
          }));
          return {methodCode: ng.methodCode.trim(), steps};
        })
        .filter(
          (row) =>
            String(row.methodCode ?? "").trim() !== "" || (Array.isArray(row.steps) && row.steps.length > 0)
        )
    : [];

  const academicCalendar = normalizeAcademicCalendar(op.academicCalendar);

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
          extraShifts: (nr.extraShifts || []).map((s) => ({
            name: s.name != null ? String(s.name) : "",
            startTime: s.startTime != null ? String(s.startTime) : "",
            endTime: s.endTime != null ? String(s.endTime) : "",
          })),
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
    slotDurationInMinutes: numOr(op.slotDurationInMinutes, 30),
    allowBookingBeforeHours: numOr(op.allowBookingBeforeHours, 24),
    workingConfig: {
      note: wc.note != null ? String(wc.note) : "",
      workShifts: shifts,
      regularDays: Array.isArray(wc.regularDays) ? wc.regularDays.map(String) : [],
      weekendDays: Array.isArray(wc.weekendDays) ? wc.weekendDays.map(String) : [],
      openSunday,
    },
    academicCalendar,
    methodAdmissionProcess,
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
      mandatoryAll: Array.isArray(doc.mandatoryAll) ? doc.mandatoryAll.map(normalizeDocItem) : d.documentRequirementsData.mandatoryAll,
      byMethod: Array.isArray(doc.byMethod) ? doc.byMethod.map(normalizeByMethodGroup) : d.documentRequirementsData.byMethod,
    },
    operationSettingsData: {
      ...d.operationSettingsData,
      hotline: op.hotline != null ? String(op.hotline) : d.operationSettingsData.hotline,
      emailSupport: op.emailSupport != null ? String(op.emailSupport) : d.operationSettingsData.emailSupport,
      maxBookingPerSlot:
        op.maxBookingPerSlot != null && !Number.isNaN(Number(op.maxBookingPerSlot))
          ? Number(op.maxBookingPerSlot)
          : d.operationSettingsData.maxBookingPerSlot,
      minCounsellorPerSlot:
        op.minCounsellorPerSlot != null && !Number.isNaN(Number(op.minCounsellorPerSlot))
          ? Number(op.minCounsellorPerSlot)
          : d.operationSettingsData.minCounsellorPerSlot,
      slotDurationInMinutes:
        op.slotDurationInMinutes != null && !Number.isNaN(Number(op.slotDurationInMinutes))
          ? Number(op.slotDurationInMinutes)
          : d.operationSettingsData.slotDurationInMinutes,
      allowBookingBeforeHours:
        op.allowBookingBeforeHours != null && !Number.isNaN(Number(op.allowBookingBeforeHours))
          ? Number(op.allowBookingBeforeHours)
          : d.operationSettingsData.allowBookingBeforeHours,
      workingConfig: {
        ...d.operationSettingsData.workingConfig,
        ...(op.workingConfig && typeof op.workingConfig === "object" ? op.workingConfig : {}),
        note:
          op.workingConfig?.note != null
            ? String(op.workingConfig.note)
            : d.operationSettingsData.workingConfig.note,
        workShifts: Array.isArray(op.workingConfig?.workShifts) ? op.workingConfig.workShifts : d.operationSettingsData.workingConfig.workShifts,
        regularDays: Array.isArray(op.workingConfig?.regularDays) ? op.workingConfig.regularDays : d.operationSettingsData.workingConfig.regularDays,
        weekendDays: Array.isArray(op.workingConfig?.weekendDays) ? op.workingConfig.weekendDays : d.operationSettingsData.workingConfig.weekendDays,
        isOpenSunday: Boolean(
          op.workingConfig?.isOpenSunday ??
            op.workingConfig?.openSunday ??
            d.operationSettingsData.workingConfig.isOpenSunday
        ),
      },
      methodAdmissionProcess: parseMethodAdmissionProcessFromOperation(op),
      academicCalendar: normalizeAcademicCalendarFromApi(
        op.academicCalendar ?? op.academic_calendar,
        d.operationSettingsData.academicCalendar
      ),
      admissionSeasons: normalizeAdmissionSeasonsList(
        op.admissionSeasons ?? op.admission_seasons,
        d.operationSettingsData.admissionSeasons
      ),
    },
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
  const fullPolicyRendered = cur.fullPolicyRendered ?? cur.full_policy_rendered;
  if (fullPolicyRendered != null && String(fullPolicyRendered).trim() !== "") {
    return String(fullPolicyRendered);
  }
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

/**
 * `campusCurrent` phẳng — bốn số đặt chỗ (camel/snake). Áp sau `policyDetailRendered` để field BE trả trực tiếp thắng.
 */
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
  const sd = pick("slotDurationInMinutes", "slot_duration_in_minutes");
  if (sd != null) mergedOp.slotDurationInMinutes = sd;
  const ab = pick("allowBookingBeforeHours", "allow_booking_before_hours");
  if (ab != null) mergedOp.allowBookingBeforeHours = ab;
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

  const curImageData = cur.imageData && typeof cur.imageData === "object" ? cur.imageData : {};
  const hasCampusCurrentFacility =
    Array.isArray(cur.itemList) ||
    (curImageData && (curImageData.coverUrl != null || Array.isArray(curImageData.imageList)));

  let mergedFacility;
  if (hasCampusCurrentFacility) {
    mergedFacility = {
      itemList: Array.isArray(cur.itemList) ? cur.itemList : [],
      overview: "",
      imageData: {
        coverUrl:
          curImageData.coverUrl != null && String(curImageData.coverUrl).trim() !== ""
            ? String(curImageData.coverUrl).trim()
            : curImageData.cover != null && String(curImageData.cover).trim() !== ""
              ? String(curImageData.cover).trim()
              : "",
        thumbnailUrl: curImageData.thumbnailUrl != null ? String(curImageData.thumbnailUrl) : "",
        imageList: imageListFromFacilityImageBlock(curImageData),
      },
    };
  } else if (fj && typeof fj === "object") {
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
    slotDurationInMinutes: numHq(hqOp.slotDurationInMinutes, d.operationSettingsData.slotDurationInMinutes),
    allowBookingBeforeHours: numHq(hqOp.allowBookingBeforeHours, d.operationSettingsData.allowBookingBeforeHours),
    workingConfig: resolveSchoolWideWorkingConfigDisplay(hqOp, cur),
    academicCalendar: normalizeAcademicCalendar(hqOp.academicCalendar ?? hqOp.academic_calendar),
    methodAdmissionProcess: parseMethodAdmissionProcessFromOperation(hqOp),
  };

  const curAcademicCalendar = normalizeAcademicCalendar(cur.academicCalendar ?? cur.academic_calendar);
  if (hasAnyAcademicCalendarValue(curAcademicCalendar)) {
    mergedOp.academicCalendar = curAcademicCalendar;
  }

  const pdr = campusCurrentPolicyDetailRendered(cur);
  if (pdr) {
    if (pdr.maxBookingPerSlot != null && !Number.isNaN(Number(pdr.maxBookingPerSlot)))
      mergedOp.maxBookingPerSlot = Number(pdr.maxBookingPerSlot);
    if (pdr.minCounsellorPerSlot != null && !Number.isNaN(Number(pdr.minCounsellorPerSlot)))
      mergedOp.minCounsellorPerSlot = Number(pdr.minCounsellorPerSlot);
    if (pdr.slotDurationInMinutes != null && !Number.isNaN(Number(pdr.slotDurationInMinutes)))
      mergedOp.slotDurationInMinutes = Number(pdr.slotDurationInMinutes);
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
 * BE merge partial; chỉ gửi field nhánh đã đổi (không gửi workingOverride — giờ/ca do trường cấu hình).
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
    JSON.stringify(curFacPut.itemList) !== JSON.stringify(iniFacPut.itemList) ||
    JSON.stringify(curFacPut.imageJsonData) !== JSON.stringify(iniFacPut.imageJsonData);

  const policyDirty = (policy ?? "") !== (initialPolicy ?? "");

  const num0 = (v) => (v != null && !Number.isNaN(Number(v)) ? Number(v) : 0);
  const scalarsDirty =
    num0(op.maxBookingPerSlot) !== num0(iOp.maxBookingPerSlot) ||
    num0(op.minCounsellorPerSlot) !== num0(iOp.minCounsellorPerSlot) ||
    num0(op.slotDurationInMinutes) !== num0(iOp.slotDurationInMinutes) ||
    num0(op.allowBookingBeforeHours) !== num0(iOp.allowBookingBeforeHours);

  const calOp = normalizeAcademicCalendar(op.academicCalendar);
  const calIo = normalizeAcademicCalendar(iOp.academicCalendar);
  const academicDirty = JSON.stringify(calOp) !== JSON.stringify(calIo);

  const admissionDirty =
    JSON.stringify(op.methodAdmissionProcess || []) !== JSON.stringify(iOp.methodAdmissionProcess || []);

  const anyDirty = facilityDirty || policyDirty || scalarsDirty || academicDirty || admissionDirty;
  if (!anyDirty) return {};

  const payload = {};

  if (facilityDirty) {
    payload.itemList = curFacPut.itemList;
    payload.imageJsonData = curFacPut.imageJsonData;
  }

  if (scalarsDirty) {
    if (num0(op.maxBookingPerSlot) !== num0(iOp.maxBookingPerSlot))
      payload.maxBookingPerSlot = num0(op.maxBookingPerSlot);
    if (num0(op.minCounsellorPerSlot) !== num0(iOp.minCounsellorPerSlot))
      payload.minCounsellorPerSlot = num0(op.minCounsellorPerSlot);
    if (num0(op.slotDurationInMinutes) !== num0(iOp.slotDurationInMinutes))
      payload.slotDurationInMinutes = num0(op.slotDurationInMinutes);
    if (num0(op.allowBookingBeforeHours) !== num0(iOp.allowBookingBeforeHours))
      payload.allowBookingBeforeHours = num0(op.allowBookingBeforeHours);
  }

  if (academicDirty) {
    payload.academicCalendar = calOp;
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
    itemList: curFacPut.itemList,
    imageJsonData: curFacPut.imageJsonData,
    maxBookingPerSlot: Number(op.maxBookingPerSlot) || 0,
    minCounsellorPerSlot: Number(op.minCounsellorPerSlot) || 0,
    slotDurationInMinutes: Number(op.slotDurationInMinutes) || 0,
    allowBookingBeforeHours: Number(op.allowBookingBeforeHours) || 0,
    academicCalendar: normalizeAcademicCalendar(op.academicCalendar),
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
export default function CampusConfig() {
  const isCampusVariant = true;
  const {isPrimaryBranch, currentCampusId, loading: schoolCtxLoading} = useSchool();
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

  const setTabIndex = useCallback(
    (idx) => {
      const slug = tabSlugs[idx] || tabSlugs[0] || "admission";
      setSearchParams({tab: slug}, {replace: true});
    },
    [setSearchParams, tabSlugs]
  );

  /** Tab ngày nghỉ đã tách sang menu Cài đặt ngày nghỉ — link/bookmark cũ chuyển hướng. */
  useLayoutEffect(() => {
    if (searchParams.get("tab") === "holiday") {
      navigate("/school/holiday-settings", {replace: true});
    }
  }, [searchParams, navigate]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [schoolId, setSchoolId] = useState(null);
  /** Danh sách cơ sở (platform): chọn campusId trong tab Phân bổ nguồn lực — đồng bộ GET/PUT /school/config/{schoolId}. */
  const [campusList, setCampusList] = useState([]);
  const [branchPolicyDetail, setBranchPolicyDetail] = useState("");
  /** policyDetailRendered.fullTextRendered — chỉ đọc từ GET, cập nhật sau mỗi lần load. */
  const [branchPolicyFullTextRendered, setBranchPolicyFullTextRendered] = useState("");
  /** GET campus/config: thiếu `hqDefault.operation` — không có chuẩn vận hành từ trụ sở. */
  const [campusHqOperationMissing, setCampusHqOperationMissing] = useState(false);
  const branchHqOperationRef = useRef(null);
  const initialPolicyRef = useRef("");
  const initialPolicyFullTextRef = useRef("");
  const [config, setConfig] = useState(() => defaultConfig());
  const initialRef = useRef(null);
  const facilityFormRef = useRef(null);
  const methodAdmissionProcessGroupRefs = useRef({});
  const [pendingScrollToProcessIdx, setPendingScrollToProcessIdx] = useState(null);
  const [lastLoadedAt, setLastLoadedAt] = useState(null);
  const [admissionMethodExpanded, setAdmissionMethodExpanded] = useState({});

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
    (config.operationSettingsData?.methodAdmissionProcess || []).forEach((g) => {
      const c = String(g?.methodCode ?? "").trim();
      if (c && !codes.has(c)) codes.set(c, c);
    });
    return Array.from(codes.entries())
      .map(([value, label]) => ({value, label}))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [
    config.admissionSettingsData?.allowedMethods,
    config.documentRequirementsData?.byMethod,
    config.operationSettingsData?.methodAdmissionProcess,
  ]);

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

  const handleReset = useCallback(() => {
    const init = initialRef.current;
    if (!init) return;
    setConfig(JSON.parse(JSON.stringify(init)));
    setBranchPolicyDetail(initialPolicyRef.current ?? "");
    setBranchPolicyFullTextRendered(initialPolicyFullTextRef.current ?? "");
    setEditing(false);
    enqueueSnackbar("Đã huỷ thay đổi", {variant: "info"});
  }, []);

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
      if (payload.itemList != null || payload.imageJsonData != null) {
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
    const schoolPayload = buildPartialPayload(config, initial);

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

    setSaving(true);
    try {
      const resSchool = await updateSchoolConfig(schoolId, schoolPayload);
      if (resSchool?.status < 200 || resSchool?.status >= 300) {
        enqueueSnackbar(resSchool?.data?.message || "Có lỗi khi lưu cấu hình trường", {variant: "error"});
        await load({silent: true});
        return;
      }
      enqueueSnackbar(schoolConfigSaveSuccessMessage(resSchool?.data?.message), {variant: "success"});
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
    branchPolicyDetail,
    setTabIndex,
    editing,
    load,
  ]);

  const allocatedTotal = useMemo(() => {
    return (config.quotaConfigData?.campusAssignments || []).reduce((s, r) => s + Number(r.allocatedQuota || 0), 0);
  }, [config.quotaConfigData?.campusAssignments]);

  const systemQuota = Number(config.quotaConfigData?.totalSystemQuota || 0);
  const quotaMismatch = systemQuota > 0 && allocatedTotal !== systemQuota;

  const toggleAdmissionMethod = useCallback(
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

  const removeAdmissionAllowedAt = useCallback((idx) => {
    setConfig((c) => {
      const arr = [...(c.admissionSettingsData.allowedMethods || [])];
      arr.splice(idx, 1);
      return {...c, admissionSettingsData: {...c.admissionSettingsData, allowedMethods: arr}};
    });
  }, []);

  const addMethodAdmissionProcess = useCallback(() => {
    let newIndex = 0;
    setConfig((c) => {
      const prev = [...(c.operationSettingsData.methodAdmissionProcess || [])];
      newIndex = prev.length;
      prev.push({methodCode: "", steps: [{stepName: "", stepOrder: 1, description: ""}]});
      return {
        ...c,
        operationSettingsData: {
          ...c.operationSettingsData,
          methodAdmissionProcess: prev,
        },
      };
    });
    setTimeout(() => setPendingScrollToProcessIdx(newIndex), 0);
  }, []);

  const removeMethodAdmissionProcessAt = useCallback((groupIdx) => {
    setConfig((c) => {
      const arr = [...(c.operationSettingsData.methodAdmissionProcess || [])];
      arr.splice(groupIdx, 1);
      return {...c, operationSettingsData: {...c.operationSettingsData, methodAdmissionProcess: arr}};
    });
  }, []);

  const updateMethodAdmissionProcessCode = useCallback((groupIdx, methodCode) => {
    setConfig((c) => {
      const arr = [...(c.operationSettingsData.methodAdmissionProcess || [])];
      if (!arr[groupIdx]) return c;
      arr[groupIdx] = {...arr[groupIdx], methodCode};
      return {...c, operationSettingsData: {...c.operationSettingsData, methodAdmissionProcess: arr}};
    });
  }, []);

  const addAdmissionStepToMethod = useCallback((groupIdx) => {
    setConfig((c) => {
      const arr = [...(c.operationSettingsData.methodAdmissionProcess || [])];
      const g = arr[groupIdx];
      if (!g) return c;
      const steps = [...(g.steps || [])];
      steps.push({stepName: "", stepOrder: steps.length + 1, description: ""});
      arr[groupIdx] = {...g, steps};
      return {...c, operationSettingsData: {...c.operationSettingsData, methodAdmissionProcess: arr}};
    });
  }, []);

  const updateAdmissionStepInMethod = useCallback((groupIdx, stepIdx, field, value) => {
    setConfig((c) => {
      const arr = [...(c.operationSettingsData.methodAdmissionProcess || [])];
      const g = arr[groupIdx];
      if (!g) return c;
      const steps = (g.steps || []).map((s, i) => (i === stepIdx ? {...s, [field]: value} : s));
      arr[groupIdx] = {...g, steps};
      return {...c, operationSettingsData: {...c.operationSettingsData, methodAdmissionProcess: arr}};
    });
  }, []);

  const removeAdmissionStepInMethod = useCallback((groupIdx, stepIdx) => {
    setConfig((c) => {
      const arr = [...(c.operationSettingsData.methodAdmissionProcess || [])];
      const g = arr[groupIdx];
      if (!g) return c;
      const steps = (g.steps || []).filter((_, i) => i !== stepIdx).map((s, i) => ({...s, stepOrder: i + 1}));
      arr[groupIdx] = {...g, steps};
      return {...c, operationSettingsData: {...c.operationSettingsData, methodAdmissionProcess: arr}};
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

  const addMandatoryDocument = useCallback(() => {
    setConfig((c) => ({
      ...c,
      documentRequirementsData: {
        ...c.documentRequirementsData,
        mandatoryAll: [...(c.documentRequirementsData.mandatoryAll || []), {code: "", name: "", required: true}],
      },
    }));
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

  const addByMethodGroup = useCallback(() => {
    setConfig((c) => ({
      ...c,
      documentRequirementsData: {
        ...c.documentRequirementsData,
        byMethod: [...(c.documentRequirementsData.byMethod || []), {methodCode: "", documents: []}],
      },
    }));
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

  const showAdmissionTab = !useCampusConfigFlow && tabIndex === 0;
  const showDocumentsTab = !useCampusConfigFlow && tabIndex === 1;
  const showOperationTab = (!useCampusConfigFlow && tabIndex === 2) || (useCampusConfigFlow && tabIndex === 0);
  const showFinanceTab = !useCampusConfigFlow && tabIndex === 3;
  const showFacilityTab =
    (!useCampusConfigFlow && tabIndex === 4) || (useCampusConfigFlow && tabIndex === 1);
  const showQuotaTab = !useCampusConfigFlow && tabIndex === 5;
  const showResourceDistributionTab = !useCampusConfigFlow && tabIndex === 6;


  const pageTitle = isCampusVariant ? "Cấu hình của cơ sở" : "Cấu hình chung cho các cơ sở";
  const pageSubtitle = isCampusVariant
    ? isPrimaryBranch
      ? "Chỉnh vận hành và CSVC của cơ sở chính. Mỗi cơ sở chỉ sửa được cấu hình của chính mình. Sau khi Lưu, nội dung được phản ánh trong Bản chỉnh sửa từ cơ sở."
      : "Chỉnh vận hành và CSVC của cơ sở bạn. Sau khi Lưu, xem Bản chỉnh sửa từ cơ sở — bản văn thống nhất BE trả về."
    : "Cấu hình chung cho tất cả các cơ sở bao gồm: Quản lý tuyển sinh, hồ sơ, vận hành, chỉ tiêu, tài chính, cơ sở vật chất chung và phân bổ nguồn lực.";

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
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{mb: 2}}>
                  <Typography sx={{fontWeight: 800, fontSize: 18}}>Phương thức tuyển sinh</Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon/>}
                    onClick={addAdmissionMethod}
                    sx={{textTransform: "none", fontWeight: 700, borderRadius: 2, ...blockPointerSx}}
                  >
                    Thêm
                  </Button>
                </Stack>
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
                              ...(fieldDisabled ? blockPointerSx : {}),
                            }}
                          >
                            <FormControlLabel
                              sx={{alignItems: "flex-start", m: 0, mr: 0}}
                              control={
                                <Checkbox
                                  checked={checked}
                                  onChange={(e) => {
                                    if (fieldDisabled) return;
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
                              onClick={() => removeAdmissionAllowedAt(idx)}
                              aria-label="Xoá phương thức"
                              sx={blockPointerSx}
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
                    inputProps={{readOnly: fieldDisabled}}
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
                    inputProps={{readOnly: fieldDisabled}}
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
                  <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} mb={2} flexWrap="wrap">
                      <Box sx={{flex: 1, minWidth: 220}}>
                        <Typography sx={{fontWeight: 800}}>Các khoản phí</Typography>
                      </Box>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<AddIcon/>}
                        onClick={() =>
                          setConfig((c) => {
                            const fin = c.financePolicyData;
                            const nextItems = [...(fin.feeItems || []), emptyFinanceFeeItem()];
                            return {
                              ...c,
                              financePolicyData: {
                                ...fin,
                                feeItems: nextItems,
                                reservationFee: reservationFeeSnapshotFromItems(nextItems),
                              },
                            };
                          })
                        }
                        sx={{textTransform: "none", fontWeight: 700, borderRadius: 2, flexShrink: 0, ...blockPointerSx}}
                      >
                        Thêm khoản phí
                      </Button>
                    </Stack>
                    <Stack spacing={2.5}>
                      {(config.financePolicyData.feeItems || []).length === 0 ? (
                        <Paper variant="outlined" sx={{p: 2, borderStyle: "dashed", color: "#64748b", borderRadius: 2}}>
                          Chưa có khoản phí. Nhấn &quot;Thêm khoản phí&quot; và điền đủ feeCode (vd. RESERVATION_FEE, ADMISSION_FORM_FEE).
                        </Paper>
                      ) : null}
                      {(config.financePolicyData.feeItems || []).map((row, idx) => {
                        const accent = METHOD_PROCESS_VISUAL_ACCENTS[0];
                        const codeTrim = String(row.feeCode ?? "").trim();
                        return (
                          <Accordion
                            key={`fee-${idx}-${codeTrim || "new"}`}
                            defaultExpanded
                            elevation={0}
                            disableGutters
                            sx={{
                              borderRadius: 2,
                              overflow: "hidden",
                              border: "1px solid",
                              borderColor: accent.border,
                              boxShadow: "none",
                              bgcolor: "#ffffff",
                              "&:before": {display: "none"},
                              "&.Mui-expanded": {margin: "20px 0"},
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
                                    label={`Khoản ${idx + 1}`}
                                    size="small"
                                    sx={{bgcolor: accent.bar, color: "#fff", fontWeight: 800, letterSpacing: "0.02em"}}
                                  />
                                  {codeTrim ? (
                                    <Chip
                                      label={codeTrim}
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
                                    <Chip
                                      label="Chưa có mã phí"
                                      size="small"
                                      sx={{bgcolor: "#e2e8f0", color: "#475569", fontWeight: 700}}
                                    />
                                  )}
                                  {row.isReservationFee ? (
                                    <Chip label="Phí giữ chỗ" size="small" sx={{fontWeight: 800, bgcolor: accent.stepsBg, color: accent.bar}} />
                                  ) : null}
                                  {row.isMandatory ? (
                                    <Chip
                                      label="Bắt buộc"
                                      size="small"
                                      variant="outlined"
                                      sx={{fontWeight: 700, borderColor: accent.bar, color: "#0f172a"}}
                                    />
                                  ) : null}
                                </Stack>
                              </Box>
                            </AccordionSummary>
                            <AccordionDetails sx={{p: 0, display: "block"}}>
                              <CardContent sx={{py: 2, px: 2, bgcolor: "rgba(248, 250, 252, 0.9)"}}>
                                <Stack spacing={2}>
                                  <Stack
                                    direction={{xs: "column", sm: "row"}}
                                    spacing={1.5}
                                    alignItems={{sm: "flex-start"}}
                                    justifyContent="space-between"
                                  >
                                    <Box sx={{flex: 1, minWidth: 0, width: "100%"}}>
                                      <Stack direction={{xs: "column", sm: "row"}} spacing={1.5}>
                                        <TextField
                                          size="small"
                                          label="Mã định danh loại phí"
                                          value={row.feeCode ?? ""}
                                          onChange={(e) => {
                                            const v = e.target.value;
                                            setConfig((c) => {
                                              const fin = c.financePolicyData;
                                              const nextItems = [...(fin.feeItems || [])];
                                              nextItems[idx] = {...nextItems[idx], feeCode: v};
                                              return {
                                                ...c,
                                                financePolicyData: {
                                                  ...fin,
                                                  feeItems: nextItems,
                                                  reservationFee: reservationFeeSnapshotFromItems(nextItems),
                                                },
                                              };
                                            });
                                          }}
                                          fullWidth
                                          inputProps={{readOnly: fieldDisabled}}
                                          placeholder="VD: RESERVATION_FEE"
                                        />
                                        <TextField
                                          size="small"
                                          label="Tên hiển thị"
                                          value={row.feeName ?? ""}
                                          onChange={(e) => {
                                            const v = e.target.value;
                                            setConfig((c) => {
                                              const fin = c.financePolicyData;
                                              const nextItems = [...(fin.feeItems || [])];
                                              nextItems[idx] = {...nextItems[idx], feeName: v};
                                              return {
                                                ...c,
                                                financePolicyData: {
                                                  ...fin,
                                                  feeItems: nextItems,
                                                  reservationFee: reservationFeeSnapshotFromItems(nextItems),
                                                },
                                              };
                                            });
                                          }}
                                          fullWidth
                                          inputProps={{readOnly: fieldDisabled}}
                                        />
                                      </Stack>
                                    </Box>
                                    <IconButton
                                      size="small"
                                      color="error"
                                      aria-label="Xóa khoản phí"
                                      onClick={() =>
                                        setConfig((c) => {
                                          const fin = c.financePolicyData;
                                          const nextItems = [...(fin.feeItems || [])];
                                          nextItems.splice(idx, 1);
                                          return {
                                            ...c,
                                            financePolicyData: {
                                              ...fin,
                                              feeItems: nextItems,
                                              reservationFee: reservationFeeSnapshotFromItems(nextItems),
                                            },
                                          };
                                        })
                                      }
                                      disabled={fieldDisabled}
                                      sx={{...blockPointerSx}}
                                    >
                                      <DeleteOutlineIcon fontSize="small"/>
                                    </IconButton>
                                  </Stack>
                                  <Divider sx={{borderColor: accent.stepsBorder, opacity: 1}}/>
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
                                    Số tiền & hiển thị
                                  </Typography>
                                  <Card
                                    variant="outlined"
                                    sx={{
                                      borderRadius: 2,
                                      bgcolor: accent.stepsBg,
                                      borderColor: accent.stepsBorder,
                                      borderWidth: 1,
                                    }}
                                  >
                                    <CardContent sx={{py: 1.5, "&:last-child": {pb: 1.5}}}>
                                      <Stack direction={{xs: "column", sm: "row"}} spacing={1.5}>
                                        <TextField
                                          size="small"
                                          label="Số lượng"
                                          type="number"
                                          value={row.amount === "" || row.amount == null ? "" : row.amount}
                                          onChange={(e) => {
                                            const raw = e.target.value;
                                            const n = raw === "" ? "" : Number(raw) || 0;
                                            setConfig((c) => {
                                              const fin = c.financePolicyData;
                                              const nextItems = [...(fin.feeItems || [])];
                                              const cur = nextItems[idx] || {};
                                              nextItems[idx] = {...cur, amount: n};
                                              return {
                                                ...c,
                                                financePolicyData: {
                                                  ...fin,
                                                  feeItems: nextItems,
                                                  reservationFee: reservationFeeSnapshotFromItems(nextItems),
                                                },
                                              };
                                            });
                                          }}
                                          onBlur={() => {
                                            setConfig((c) => {
                                              const fin = c.financePolicyData;
                                              const nextItems = [...(fin.feeItems || [])];
                                              const cur = nextItems[idx] || {};
                                              const hasAmount = row.amount !== "" && row.amount != null;
                                              const n = hasAmount ? Number(row.amount) || 0 : "";
                                              nextItems[idx] = {
                                                ...cur,
                                                amount: n,
                                                display: hasAmount ? formatVndDisplay(n) : "",
                                              };
                                              return {
                                                ...c,
                                                financePolicyData: {
                                                  ...fin,
                                                  feeItems: nextItems,
                                                  reservationFee: reservationFeeSnapshotFromItems(nextItems),
                                                },
                                              };
                                            });
                                          }}
                                          sx={{minWidth: {sm: 160}}}
                                          inputProps={{readOnly: fieldDisabled}}
                                        />
                                        <TextField
                                          size="small"
                                          label="Đơn vị tiền tệ"
                                          value={row.currency ?? "VND"}
                                          onChange={(e) => {
                                            const v = e.target.value;
                                            setConfig((c) => {
                                              const fin = c.financePolicyData;
                                              const nextItems = [...(fin.feeItems || [])];
                                              nextItems[idx] = {...nextItems[idx], currency: v};
                                              return {
                                                ...c,
                                                financePolicyData: {
                                                  ...fin,
                                                  feeItems: nextItems,
                                                  reservationFee: reservationFeeSnapshotFromItems(nextItems),
                                                },
                                              };
                                            });
                                          }}
                                          sx={{maxWidth: {sm: 120}}}
                                          inputProps={{readOnly: fieldDisabled}}
                                        />
                                        <TextField
                                          size="small"
                                          label="Số tiền"
                                          value={row.display ?? ""}
                                          onChange={(e) => {
                                            const v = e.target.value;
                                            setConfig((c) => {
                                              const fin = c.financePolicyData;
                                              const nextItems = [...(fin.feeItems || [])];
                                              nextItems[idx] = {...nextItems[idx], display: v};
                                              return {
                                                ...c,
                                                financePolicyData: {
                                                  ...fin,
                                                  feeItems: nextItems,
                                                  reservationFee: reservationFeeSnapshotFromItems(nextItems),
                                                },
                                              };
                                            });
                                          }}
                                          fullWidth
                                          inputProps={{readOnly: fieldDisabled}}
                                          placeholder="VD: 2.000.000 VNĐ"
                                        />
                                      </Stack>
                                    </CardContent>
                                  </Card>
                                  <Divider sx={{borderColor: accent.stepsBorder, opacity: 1}}/>
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
                                    Tuỳ chọn & mô tả
                                  </Typography>
                                  <Stack direction={{xs: "column", sm: "row"}} spacing={1} alignItems={{sm: "center"}} flexWrap="wrap" useFlexGap>
                                    <FormControlLabel
                                      control={
                                        <Checkbox
                                          size="small"
                                          checked={Boolean(row.isMandatory)}
                                          onChange={(e) => {
                                            const checked = e.target.checked;
                                            setConfig((c) => {
                                              const fin = c.financePolicyData;
                                              const nextItems = [...(fin.feeItems || [])];
                                              nextItems[idx] = {...nextItems[idx], isMandatory: checked};
                                              return {
                                                ...c,
                                                financePolicyData: {
                                                  ...fin,
                                                  feeItems: nextItems,
                                                  reservationFee: reservationFeeSnapshotFromItems(nextItems),
                                                },
                                              };
                                            });
                                          }}
                                          disabled={fieldDisabled}
                                        />
                                      }
                                      label="Bắt buộc"
                                    />
                                    <FormControlLabel
                                      control={
                                        <Checkbox
                                          size="small"
                                          checked={Boolean(row.isReservationFee)}
                                          onChange={(e) => {
                                            const checked = e.target.checked;
                                            setConfig((c) => {
                                              const fin = c.financePolicyData;
                                              const nextItems = mapFeeItemsExclusiveReservation(fin.feeItems || [], idx, checked);
                                              return {
                                                ...c,
                                                financePolicyData: {
                                                  ...fin,
                                                  feeItems: nextItems,
                                                  reservationFee: reservationFeeSnapshotFromItems(nextItems),
                                                },
                                              };
                                            });
                                          }}
                                          disabled={fieldDisabled}
                                        />
                                      }
                                      label="Phí giữ chỗ"
                                    />
                                  </Stack>
                                  <TextField
                                    size="small"
                                    label="Mô tả"
                                    value={row.description ?? ""}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      setConfig((c) => {
                                        const fin = c.financePolicyData;
                                        const nextItems = [...(fin.feeItems || [])];
                                        nextItems[idx] = {...nextItems[idx], description: v};
                                        return {
                                          ...c,
                                          financePolicyData: {
                                            ...fin,
                                            feeItems: nextItems,
                                            reservationFee: reservationFeeSnapshotFromItems(nextItems),
                                          },
                                        };
                                      });
                                    }}
                                    fullWidth
                                    multiline
                                    minRows={2}
                                    inputProps={{readOnly: fieldDisabled}}
                                  />
                                </Stack>
                              </CardContent>
                            </AccordionDetails>
                          </Accordion>
                        );
                      })}
                    </Stack>
                  </Box>

                  <TextField
                    label="Ghi chú thanh toán"
                    multiline
                    minRows={4}
                    value={config.financePolicyData.paymentNotes ?? ""}
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        financePolicyData: {...c.financePolicyData, paymentNotes: e.target.value},
                      }))
                    }
                    fullWidth
                    inputProps={{readOnly: fieldDisabled}}
                  />

                  <Divider/>
                  
                  <Stack direction={{xs: "column", sm: "row"}} spacing={2}>
                    <TextField
                      label="Hạn mức giảm tối đa / so với giá gốc"
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
                      label="Hạn mức tăng tối đa / so với giá gốc"
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
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<AddIcon/>}
                      onClick={addMandatoryDocument}
                      sx={{textTransform: "none", fontWeight: 700, borderRadius: 2, ...blockPointerSx}}
                    >
                      Thêm
                    </Button>
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
                                list[idx] = {...list[idx], code: v};
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
                                list[idx] = {...list[idx], name: v};
                                return {...c, documentRequirementsData: {...c.documentRequirementsData, mandatoryAll: list}};
                              });
                            }}
                            fullWidth
                          />
                        </Stack>
                      )}
                      <Stack direction="row" alignItems="center" spacing={1} sx={{flexShrink: 0}}>
                        <Typography variant="caption">Bắt buộc</Typography>
                        <Switch
                          checked={Boolean(doc.required)}
                          onChange={(e) => {
                            if (fieldDisabled) return;
                            const v = e.target.checked;
                            setConfig((c) => {
                              const list = [...(c.documentRequirementsData.mandatoryAll || [])];
                              list[idx] = {...list[idx], required: v};
                              return {...c, documentRequirementsData: {...c.documentRequirementsData, mandatoryAll: list}};
                            });
                          }}
                          sx={blockPointerSx}
                        />
                      </Stack>
                    </Box>
                  ))}
                </Stack>

                <Divider sx={{my: 3}}/>

                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{mb: 2}}>
                  <Typography sx={{fontWeight: 800}}>Theo phương thức tuyển sinh</Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon/>}
                    onClick={addByMethodGroup}
                    sx={{textTransform: "none", fontWeight: 700, borderRadius: 2, ...blockPointerSx}}
                  >
                    Thêm nhóm phương thức
                  </Button>
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
                      <Typography sx={{fontWeight: 700}}>{summaryLabel}</Typography>
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
                        Chưa có cấu hình vận hành từ cơ sở chính
                      </Typography>
                      <Typography variant="body2" component="div" sx={{lineHeight: 1.65}}>
                        Trụ sở chưa gửi khối vận hành HQ (hqDefault.operation) hoặc đang rỗng. Vui lòng cấu hình vận hành tại
                        cơ sở chính trước; campus chỉ chỉnh phần delta khi đã có chuẩn HQ.
                      </Typography>
                    </Alert>
                  ) : null}
                  <Alert severity="info" sx={{borderRadius: 2}}>
                    <Typography variant="body2" component="div" sx={{fontWeight: 700, mb: 0.75}}>
                      Cấu hình theo cơ sở
                    </Typography>
                    <Typography variant="body2" component="div" sx={{lineHeight: 1.65}}>
                      Các thay đổi của cơ sở sẽ được lưu lại trong <strong>Bản chỉnh sửa từ cơ sở</strong> phía dưới.
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
                      <Typography sx={{fontWeight: 800, mb: 1.5}}>Bản chỉnh sửa từ cơ sở</Typography>
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
                            Chưa có nội dung.
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
                    <Stack direction={{xs: "column", sm: "row"}} spacing={2} useFlexGap sx={{flexWrap: "wrap"}}>
                      <TextField
                        label="Số phụ huynh tối đa trong 1 ca"
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
                        helperText="*Số lượng khách tối đa được phép đặt vào một khung giờ."
                        FormHelperTextProps={{sx: {fontWeight: 700}}}
                        inputProps={{readOnly: fieldDisabled, min: 0}}
                        sx={{minWidth: 200, flex: 1}}
                      />
                      <TextField
                        label="Tư vấn viên tối thiểu trong 1 ca"
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
                        helperText="*Số lượng tư vấn viên tối thiểu trực trong một ca."
                        FormHelperTextProps={{sx: {fontWeight: 700}}}
                        inputProps={{readOnly: fieldDisabled, min: 0}}
                        sx={{minWidth: 200, flex: 1}}
                      />
                      <TextField
                        label="Thời lượng 1 ca (phút)"
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
                        FormHelperTextProps={{sx: {fontWeight: 700}}}
                        inputProps={{readOnly: fieldDisabled, min: 0}}
                        sx={{minWidth: 180, flex: 1}}
                      />
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
                        helperText="*Thời gian tối thiểu phải đặt trước khi cuộc hẹn diễn ra."
                        FormHelperTextProps={{sx: {fontWeight: 700}}}
                        inputProps={{readOnly: fieldDisabled, min: 0}}
                        sx={{minWidth: 180, flex: 1}}
                      />
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>

              <SchoolWideScheduleReadOnlyPanel
                workingConfig={config.operationSettingsData.workingConfig}
                showSchoolOperationCta={isPrimaryBranch}
              />

              <Card sx={{borderRadius: "12px", border: "1px solid rgba(226,232,240,1)", boxShadow: "0 8px 24px rgba(15,23,42,0.06)"}}>
                <CardContent sx={{p: 3}}>
                  <Typography sx={{fontWeight: 800, mb: 2}}>Lịch năm học</Typography>
                  <Stack spacing={2}>
                    <Stack direction={{xs: "column", md: "row"}} spacing={2}>
                      <TextField
                        label="Học kỳ 1 - Bắt đầu"
                        type="date"
                        size="small"
                        InputLabelProps={{shrink: true}}
                        value={config.operationSettingsData.academicCalendar?.term1?.start ?? ""}
                        inputProps={{readOnly: true}}
                        fullWidth
                      />
                      <TextField
                        label="Học kỳ 1 - Kết thúc"
                        type="date"
                        size="small"
                        InputLabelProps={{shrink: true}}
                        value={config.operationSettingsData.academicCalendar?.term1?.end ?? ""}
                        inputProps={{readOnly: true}}
                        fullWidth
                      />
                    </Stack>
                    <Stack direction={{xs: "column", md: "row"}} spacing={2}>
                      <TextField
                        label="Học kỳ 2 - Bắt đầu"
                        type="date"
                        size="small"
                        InputLabelProps={{shrink: true}}
                        value={config.operationSettingsData.academicCalendar?.term2?.start ?? ""}
                        inputProps={{readOnly: true}}
                        fullWidth
                      />
                      <TextField
                        label="Học kỳ 2 - Kết thúc"
                        type="date"
                        size="small"
                        InputLabelProps={{shrink: true}}
                        value={config.operationSettingsData.academicCalendar?.term2?.end ?? ""}
                        inputProps={{readOnly: true}}
                        fullWidth
                      />
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>

              <Card sx={{borderRadius: "12px", border: "1px solid rgba(226,232,240,1)", boxShadow: "0 8px 24px rgba(15,23,42,0.06)"}}>
                <CardContent sx={{p: 3}}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} mb={2} flexWrap="wrap">
                    <Box sx={{flex: 1, minWidth: 220}}>
                      <Typography sx={{fontWeight: 800}}>Quy trình tuyển sinh theo phương thức</Typography>
                    </Box>
                    <Button startIcon={<AddIcon/>} onClick={addMethodAdmissionProcess} sx={{textTransform: "none", flexShrink: 0, ...blockPointerSx}}>
                      Thêm phương thức
                    </Button>
                  </Stack>
                  <Stack spacing={2.5}>
                    {(config.operationSettingsData.methodAdmissionProcess || []).length === 0 ? (
                      <Paper variant="outlined" sx={{p: 2, borderStyle: "dashed", color: "#64748b", borderRadius: 2}}>
                        Chưa có quy trình theo phương thức. Nhấn &quot;Thêm phương thức&quot; và chọn đúng mã (vd. ACADEMIC_RECORD,
                        INTERNAL_TEST).
                      </Paper>
                    ) : null}
                    {(config.operationSettingsData.methodAdmissionProcess || []).map((group, gi) => {
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
      </Paper>
    </Box>
  );
}
