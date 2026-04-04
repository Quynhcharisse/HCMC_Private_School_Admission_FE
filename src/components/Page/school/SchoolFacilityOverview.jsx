import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  FormControlLabel,
  IconButton,
  LinearProgress,
  Paper,
  Slider,
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
import {useSearchParams} from "react-router-dom";
import {enqueueSnackbar} from "notistack";

import {extractCampusListBody, listCampuses} from "../../../services/CampusService.jsx";
import {
  getSchoolConfig,
  parseSchoolConfigResponseBody,
  updateSchoolConfig,
} from "../../../services/SchoolFacilityService.jsx";
import {SchoolFacilityFacilityForm} from "./SchoolFacilityConfiguration.jsx";

const TAB_SLUGS = ["admission", "quota", "finance", "documents", "operation", "facility"];
const TAB_LABELS = [
  "Cài đặt Tuyển sinh",
  "Cài đặt Chỉ tiêu",
  "Cài đặt Tài chính",
  "Cài đặt Hồ sơ",
  "Cài đặt Vận hành",
  "Cài đặt Cơ sở vật chất",
];

const METHOD_CATALOG = [
  {code: "ACADEMIC_RECORD", description: "Dựa trên điểm 5 học kỳ", displayName: "Xét học bạ"},
  {code: "ENTRANCE_EXAM", description: "Kỳ thi riêng của trường", displayName: "Thi tuyển"},
];

const DAY_CODES = [
  {code: "MON", label: "T2"},
  {code: "TUE", label: "T3"},
  {code: "WED", label: "T4"},
  {code: "THU", label: "T5"},
  {code: "FRI", label: "T6"},
  {code: "SAT", label: "T7"},
  {code: "SUN", label: "CN"},
];

function defaultConfig() {
  return {
    admissionSettingsData: {
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
      workingConfig: {
        note: "",
        workShifts: [],
        regularDays: ["MON", "TUE", "WED", "THU", "FRI"],
        weekendDays: ["SAT"],
        isOpenSunday: false,
      },
      admissionSteps: [],
    },
    facilityData: {
      itemList: [],
      overview: "",
      imageData: {coverUrl: "", imageList: []},
    },
  };
}

function mergeMethodCatalog(methodsFromApi) {
  const map = new Map(METHOD_CATALOG.map((m) => [m.code, {...m}]));
  (methodsFromApi || []).forEach((m) => {
    const code = m?.code != null ? String(m.code).trim() : "";
    if (!code) return;
    const base = map.get(code) || {code, description: "", displayName: code};
    map.set(code, {...base, ...m, code});
  });
  return Array.from(map.values());
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

  if (rawDat) {
    const img = rawDat.imageData && typeof rawDat.imageData === "object" ? rawDat.imageData : {};
    return {
      itemList: Array.isArray(rawDat.itemList) ? rawDat.itemList : [],
      overview: rawDat.overview != null ? String(rawDat.overview) : "",
      imageData: {
        coverUrl: img.coverUrl != null && String(img.coverUrl).trim() !== "" ? img.coverUrl : "",
        imageList: Array.isArray(img.imageList) ? img.imageList : [],
      },
    };
  }

  const imgTpl = tpl.imageData && typeof tpl.imageData === "object" ? tpl.imageData : {};
  return {
    itemList: Array.isArray(tpl.itemList) ? tpl.itemList : [],
    overview: tpl.overview != null ? String(tpl.overview) : "",
    imageData: {
      coverUrl: imgTpl.coverUrl != null && String(imgTpl.coverUrl).trim() !== "" ? imgTpl.coverUrl : "",
      imageList: Array.isArray(imgTpl.imageList) ? imgTpl.imageList : [],
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

function sanitizeFinancePolicyForApi(f) {
  if (!f || typeof f !== "object") return f;
  const rf = f.reservationFee && typeof f.reservationFee === "object" ? f.reservationFee : {};
  const pa = f.priceAdjustment && typeof f.priceAdjustment === "object" ? f.priceAdjustment : {};
  return {
    paymentNotes: f.paymentNotes != null ? String(f.paymentNotes) : "",
    reservationFee: {
      amount: rf.amount != null ? Number(rf.amount) || 0 : 0,
      display: rf.display != null ? String(rf.display) : "",
      currency: rf.currency != null ? String(rf.currency) : "VND",
    },
    priceAdjustment: {
      minPercent: pa.minPercent != null ? Number(pa.minPercent) || 0 : 0,
      maxPercent: pa.maxPercent != null ? Number(pa.maxPercent) || 0 : 0,
    },
  };
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
  const steps = Array.isArray(op.admissionSteps)
    ? op.admissionSteps.map((s, i) => ({
        stepName: s.stepName != null ? String(s.stepName) : "",
        stepOrder: s.stepOrder != null ? Number(s.stepOrder) : i + 1,
        description: s.description != null ? String(s.description) : "",
      }))
    : [];
  return {
    hotline: op.hotline != null ? String(op.hotline) : "",
    emailSupport: op.emailSupport != null ? String(op.emailSupport) : "",
    workingConfig: {
      note: wc.note != null ? String(wc.note) : "",
      workShifts: shifts,
      regularDays: Array.isArray(wc.regularDays) ? wc.regularDays.map(String) : [],
      weekendDays: Array.isArray(wc.weekendDays) ? wc.weekendDays.map(String) : [],
      isOpenSunday: Boolean(wc.isOpenSunday),
    },
    admissionSteps: steps,
  };
}

function sanitizeFacilityDataForApi(f) {
  if (!f || typeof f !== "object") return f;
  const itemList = Array.isArray(f.itemList)
    ? f.itemList.map((it) => ({
        facilityCode: it.facilityCode != null ? String(it.facilityCode).trim() : "",
        name: it.name != null ? String(it.name) : "",
        value: it.value != null ? Number(it.value) || 0 : 0,
        unit: it.unit != null ? String(it.unit) : "",
        category: it.category != null ? String(it.category) : "",
      }))
    : [];
  const img = f.imageData && typeof f.imageData === "object" ? f.imageData : {};
  const imageList = Array.isArray(img.imageList)
    ? img.imageList.map((im) => {
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
      })
    : [];
  return {
    itemList,
    overview: f.overview != null ? String(f.overview) : "",
    imageData: {
      coverUrl: img.coverUrl != null ? String(img.coverUrl) : "",
      imageList,
    },
  };
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
  const resFee = fin.reservationFee && typeof fin.reservationFee === "object" ? fin.reservationFee : {};
  const doc = pickSection(body, "documentRequirementsData", "document_requirements");
  const op = pickSection(body, "operationSettingsData", "operation_settings");
  const fac = mergeFacilityFromBody(body);

  const imageData = fac.imageData && typeof fac.imageData === "object" ? fac.imageData : {};

  return {
    admissionSettingsData: {
      ...d.admissionSettingsData,
      ...adm,
      allowedMethods: Array.isArray(adm.allowedMethods) ? adm.allowedMethods : d.admissionSettingsData.allowedMethods,
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
    financePolicyData: {
      ...d.financePolicyData,
      ...fin,
      reservationFee: {
        ...d.financePolicyData.reservationFee,
        ...resFee,
        display: resFee.display || formatVndDisplay(resFee.amount ?? 0),
      },
      priceAdjustment: {...d.financePolicyData.priceAdjustment, ...(fin.priceAdjustment || {})},
    },
    documentRequirementsData: {
      ...d.documentRequirementsData,
      mandatoryAll: Array.isArray(doc.mandatoryAll) ? doc.mandatoryAll.map(normalizeDocItem) : d.documentRequirementsData.mandatoryAll,
      byMethod: Array.isArray(doc.byMethod) ? doc.byMethod.map(normalizeByMethodGroup) : d.documentRequirementsData.byMethod,
    },
    operationSettingsData: {
      ...d.operationSettingsData,
      ...op,
      workingConfig: {
        ...d.operationSettingsData.workingConfig,
        ...(op.workingConfig || {}),
        workShifts: Array.isArray(op.workingConfig?.workShifts) ? op.workingConfig.workShifts : d.operationSettingsData.workingConfig.workShifts,
        regularDays: Array.isArray(op.workingConfig?.regularDays) ? op.workingConfig.regularDays : d.operationSettingsData.workingConfig.regularDays,
        weekendDays: Array.isArray(op.workingConfig?.weekendDays) ? op.workingConfig.weekendDays : d.operationSettingsData.workingConfig.weekendDays,
      },
      admissionSteps: Array.isArray(op.admissionSteps) ? op.admissionSteps : [],
    },
    facilityData: {
      itemList: Array.isArray(fac.itemList) ? fac.itemList : [],
      overview: fac.overview ?? "",
      imageData: {
        coverUrl: imageData.coverUrl ?? "",
        imageList: Array.isArray(imageData.imageList) ? imageData.imageList : [],
      },
    },
  };
}

const CONFIG_SECTION_SANITIZERS = {
  admissionSettingsData: sanitizeAdmissionSettingsForApi,
  quotaConfigData: sanitizeQuotaConfigForApi,
  financePolicyData: sanitizeFinancePolicyForApi,
  documentRequirementsData: sanitizeDocumentRequirementsForApi,
  operationSettingsData: sanitizeOperationSettingsForApi,
  facilityData: sanitizeFacilityDataForApi,
};

function buildPartialPayload(current, initial) {
  const keys = [
    "admissionSettingsData",
    "quotaConfigData",
    "financePolicyData",
    "documentRequirementsData",
    "operationSettingsData",
    "facilityData",
  ];
  const out = {};
  for (const k of keys) {
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

function formatVndDisplay(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return "";
  return `${new Intl.NumberFormat("vi-VN").format(Number(amount))} VNĐ`;
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

const ADMISSION_METHOD_DETAIL_SKIP = new Set(["code", "displayName", "description", "__isNewRow"]);

function admissionMethodExtraEntries(m) {
  if (!m || typeof m !== "object") return [];
  return Object.entries(m).filter(([k]) => !ADMISSION_METHOD_DETAIL_SKIP.has(k));
}

export default function SchoolFacilityOverview() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabSlug = searchParams.get("tab") || "admission";
  const tabIndex = TAB_SLUGS.includes(tabSlug) ? TAB_SLUGS.indexOf(tabSlug) : 0;

  const setTabIndex = useCallback(
    (idx) => {
      const slug = TAB_SLUGS[idx] || "admission";
      setSearchParams({tab: slug}, {replace: true});
    },
    [setSearchParams]
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [schoolId, setSchoolId] = useState(null);
  const [config, setConfig] = useState(() => defaultConfig());
  const initialRef = useRef(null);
  const facilityFormRef = useRef(null);
  const [lastLoadedAt, setLastLoadedAt] = useState(null);
  const [admissionMethodExpanded, setAdmissionMethodExpanded] = useState({});

  const toggleAdmissionMethodExpand = useCallback((key) => {
    setAdmissionMethodExpanded((p) => ({...p, [key]: !p[key]}));
  }, []);

  const methodCatalog = useMemo(() => mergeMethodCatalog(config.admissionSettingsData?.allowedMethods), [config.admissionSettingsData?.allowedMethods]);

  const snapshot = useMemo(() => JSON.stringify(config), [config]);
  const isDirty = useMemo(() => {
    const init = initialRef.current;
    if (!init) return false;
    return snapshot !== JSON.stringify(init);
  }, [snapshot]);

  /** Khi không ở chế độ chỉnh sửa: khoá toàn bộ field (chỉ xem). */
  const fieldDisabled = saving || !editing;

  const load = useCallback(async (opts = {}) => {
    const silent = opts.silent === true;
    try {
      if (!silent) setLoading(true);
      const resCampuses = await listCampuses();
      const campuses = extractCampusListBody(resCampuses);
      const sid = pickSchoolIdFromCampuses(campuses);
      if (sid == null) {
        enqueueSnackbar("Không lấy được schoolId", {variant: "error"});
        return;
      }
      setSchoolId(sid);

      const cfgRes = await getSchoolConfig(sid);
      const body = parseSchoolConfigResponseBody(cfgRes);
      let next = normalizeFromApi(body);

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
      enqueueSnackbar("Không thể tải cấu hình trường", {variant: "error"});
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleReset = useCallback(() => {
    const init = initialRef.current;
    if (!init) return;
    setConfig(JSON.parse(JSON.stringify(init)));
    setEditing(false);
    enqueueSnackbar("Đã huỷ thay đổi", {variant: "info"});
  }, []);

  const patchFinanceDisplay = useCallback((amount) => {
    setConfig((c) => ({
      ...c,
      financePolicyData: {
        ...c.financePolicyData,
        reservationFee: {
          ...c.financePolicyData.reservationFee,
          amount: Number(amount) || 0,
          display: formatVndDisplay(amount),
          currency: "VND",
        },
      },
    }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!schoolId || !editing) return;
    const initial = initialRef.current;
    if (!initial) return;

    const payload = buildPartialPayload(config, initial);
    if (Object.keys(payload).length === 0) {
      enqueueSnackbar("Không có thay đổi để lưu", {variant: "info"});
          return;
        }

    if (payload.facilityData) {
      const ok = facilityFormRef.current?.validate?.() ?? true;
      if (!ok) {
        enqueueSnackbar("Vui lòng kiểm tra lại tab Cơ sở vật chất", {variant: "error"});
        setTabIndex(5);
        return;
      }
    }

    const minP = Number(config.financePolicyData?.priceAdjustment?.minPercent ?? 0);
    const maxP = Number(config.financePolicyData?.priceAdjustment?.maxPercent ?? 0);
    if (payload.financePolicyData && minP >= maxP) {
      enqueueSnackbar("% tối thiểu phải nhỏ hơn % tối đa", {variant: "error"});
      setTabIndex(2);
      return;
    }

    const pct = Number(config.admissionSettingsData?.quotaAlertThresholdPercent ?? 0);
    if (payload.admissionSettingsData && (pct < 0 || pct > 100)) {
      enqueueSnackbar("Ngưỡng cảnh báo phải từ 0 đến 100", {variant: "error"});
      setTabIndex(0);
      return;
    }

    setSaving(true);
    try {
      const res = await updateSchoolConfig(schoolId, payload);
      if (res?.status >= 200 && res?.status < 300) {
        enqueueSnackbar(res?.data?.message || "Lưu thành công", {variant: "success"});
        setEditing(false);
        await load({silent: true});
      } else {
        enqueueSnackbar(res?.data?.message || "Có lỗi khi lưu", {variant: "error"});
      }
      } catch (e) {
        console.error(e);
      enqueueSnackbar("Không thể lưu cấu hình", {variant: "error"});
      } finally {
      setSaving(false);
    }
  }, [config, schoolId, setTabIndex, editing, load]);

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

  const addAdmissionStep = useCallback(() => {
    setConfig((c) => {
      const steps = [...(c.operationSettingsData.admissionSteps || [])];
      steps.push({stepName: "", stepOrder: steps.length + 1, description: ""});
      return {...c, operationSettingsData: {...c.operationSettingsData, admissionSteps: steps}};
    });
  }, []);

  const updateStep = useCallback((index, field, value) => {
    setConfig((c) => {
      const steps = (c.operationSettingsData.admissionSteps || []).map((s, i) => (i === index ? {...s, [field]: value} : s));
      return {...c, operationSettingsData: {...c.operationSettingsData, admissionSteps: steps}};
    });
  }, []);

  const removeStep = useCallback((index) => {
    setConfig((c) => {
      const steps = (c.operationSettingsData.admissionSteps || []).filter((_, i) => i !== index).map((s, i) => ({...s, stepOrder: i + 1}));
      return {...c, operationSettingsData: {...c.operationSettingsData, admissionSteps: steps}};
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
                Cấu hình nền tảng
            </Typography>
              <Typography variant="body2" sx={{mt: 0.75, opacity: 0.95}}>
                Quản lý tuyển sinh, chỉ tiêu, tài chính, hồ sơ, vận hành và cơ sở vật chất.
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
            Cấu hình nền tảng
          </Typography>
        </Stack>

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
          {TAB_LABELS.map((label, i) => (
            <Tab
              key={TAB_SLUGS[i]}
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

        <Typography variant="body2" sx={{color: "#2563eb", fontWeight: 700, mb: 2}}>
          {TAB_LABELS[tabIndex]}
        </Typography>

        <Box sx={{pt: 0.5}}>
          {loading ? (
            <Box sx={{display: "flex", justifyContent: "center", py: 5}}>
              <CircularProgress/>
            </Box>
          ) : (
            <>
          {tabIndex === 0 && (
            <Card sx={{borderRadius: "12px", border: "1px solid rgba(226,232,240,1)", boxShadow: "0 8px 24px rgba(15,23,42,0.06)"}}>
              <CardContent sx={{p: 3}}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{mb: 2}}>
                  <Typography sx={{fontWeight: 800, fontSize: 18}}>Phương thức tuyển sinh</Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon/>}
                    disabled={fieldDisabled}
                    onClick={addAdmissionMethod}
                    sx={{textTransform: "none", fontWeight: 700, borderRadius: 2}}
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
                          <FormControlLabel
                            sx={{flex: 1, alignItems: "flex-start", m: 0, mr: 0}}
                            control={
                              <Checkbox
                                checked={checked}
                                disabled={fieldDisabled}
                                onChange={(e) => toggleAdmissionMethod(m.code, e.target.checked)}
                                sx={{pt: 0.35}}
                              />
                            }
                            label={<Typography sx={{fontWeight: 800}}>{m.displayName || m.code}</Typography>}
                          />
                          <IconButton
                            size="small"
                            onClick={() => toggleAdmissionMethodExpand(expandKey)}
                            aria-expanded={expanded}
                            aria-label={expanded ? "Thu gọn chi tiết phương thức" : "Mở rộng xem đầy đủ thông tin"}
                            sx={{mt: -0.25, color: "#64748b"}}
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
                              <Typography
                                variant="body2"
                                sx={{fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", wordBreak: "break-all", fontWeight: 600}}
                              >
                                {m.code || "—"}
                              </Typography>
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
                            {fieldDisabled && (
                              <IconButton
                                size="small"
                                onClick={() => toggleAdmissionMethodExpand(draftExpandKey)}
                                aria-expanded={draftExpanded}
                                aria-label={draftExpanded ? "Thu gọn chi tiết phương thức" : "Mở rộng xem đầy đủ thông tin"}
                                sx={{color: "#64748b"}}
                              >
                                <ExpandMoreIcon
                                  sx={{
                                    transform: draftExpanded ? "rotate(180deg)" : "none",
                                    transition: "transform 0.2s ease",
                                  }}
                                />
                              </IconButton>
                            )}
                            <IconButton
                              size="small"
                              color="error"
                              disabled={fieldDisabled}
                              onClick={() => removeAdmissionAllowedAt(idx)}
                              aria-label="Xoá phương thức"
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
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                                      wordBreak: "break-all",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {(m.code && String(m.code).trim()) || "—"}
                                  </Typography>
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
                        disabled={fieldDisabled}
                        onChange={(e) =>
                          setConfig((c) => ({
                            ...c,
                            admissionSettingsData: {...c.admissionSettingsData, autoCloseOnFull: e.target.checked},
                          }))
                        }
                      />
                    }
                    label={<Typography sx={{fontWeight: 700}}>Tự động đóng khi đủ chỉ tiêu</Typography>}
                  />

                  <Box>
                    <Typography sx={{fontWeight: 700, mb: 1}}>Ngưỡng cảnh báo chỉ tiêu (%)</Typography>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Slider
                        value={Number(config.admissionSettingsData.quotaAlertThresholdPercent ?? 0)}
                        min={0}
                        max={100}
                        disabled={fieldDisabled}
                        onChange={(_, v) =>
                          setConfig((c) => ({
                            ...c,
                            admissionSettingsData: {...c.admissionSettingsData, quotaAlertThresholdPercent: v},
                          }))
                        }
                        sx={{flex: 1}}
                      />
                      <TextField
                        size="small"
                        type="number"
                        value={config.admissionSettingsData.quotaAlertThresholdPercent ?? 0}
                        disabled={fieldDisabled}
                        onChange={(e) =>
                          setConfig((c) => ({
                            ...c,
                            admissionSettingsData: {
                              ...c.admissionSettingsData,
                              quotaAlertThresholdPercent: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                            },
                          }))
                        }
                        sx={{width: 100}}
                        inputProps={{min: 0, max: 100}}
                      />
                    </Stack>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          )}

          {tabIndex === 1 && (
            <Card sx={{borderRadius: "12px", border: "1px solid rgba(226,232,240,1)", boxShadow: "0 8px 24px rgba(15,23,42,0.06)"}}>
              <CardContent sx={{p: 3}}>
                <Stack spacing={2}>
                  <TextField
                    label="Năm học"
                    value={config.quotaConfigData.academicYear}
                    InputProps={{readOnly: true}}
                    disabled={fieldDisabled}
                    fullWidth
                    size="small"
                  />
                  <TextField
                    label="Tổng chỉ tiêu toàn hệ thống"
                    type="number"
                    value={config.quotaConfigData.totalSystemQuota ?? 0}
                    disabled={fieldDisabled}
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        quotaConfigData: {...c.quotaConfigData, totalSystemQuota: Number(e.target.value) || 0},
                      }))
                    }
                    fullWidth
                    size="small"
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
                              value={row.allocatedQuota ?? 0}
                              disabled={fieldDisabled}
                              onChange={(e) => {
                                const v = Number(e.target.value) || 0;
                                setConfig((c) => {
                                  const rows = [...(c.quotaConfigData.campusAssignments || [])];
                                  rows[idx] = {...rows[idx], allocatedQuota: v};
                                  return {...c, quotaConfigData: {...c.quotaConfigData, campusAssignments: rows}};
                                });
                              }}
                              sx={{width: 140}}
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

          {tabIndex === 2 && (
            <Card sx={{borderRadius: "12px", border: "1px solid rgba(226,232,240,1)", boxShadow: "0 8px 24px rgba(15,23,42,0.06)"}}>
              <CardContent sx={{p: 3}}>
                <Stack spacing={2}>
                  <TextField
                    label="Ghi chú thanh toán"
                    multiline
                    minRows={4}
                    value={config.financePolicyData.paymentNotes ?? ""}
                    disabled={fieldDisabled}
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        financePolicyData: {...c.financePolicyData, paymentNotes: e.target.value},
                      }))
                    }
                    fullWidth
                  />
                  <TextField
                    label="Phí giữ chỗ (VNĐ)"
                    type="number"
                    value={config.financePolicyData.reservationFee?.amount ?? 0}
                    disabled={fieldDisabled}
                    onChange={(e) => patchFinanceDisplay(e.target.value)}
                    onBlur={() => patchFinanceDisplay(config.financePolicyData.reservationFee?.amount)}
                    fullWidth
                    size="small"
                  />
                  <Typography variant="caption" sx={{color: "#64748b"}}>
                    Hiển thị: {config.financePolicyData.reservationFee?.display || formatVndDisplay(config.financePolicyData.reservationFee?.amount)}
                </Typography>
                  <Stack direction={{xs: "column", sm: "row"}} spacing={2}>
                    <TextField
                      label="% điều chỉnh tối thiểu"
                      type="number"
                      value={config.financePolicyData.priceAdjustment?.minPercent ?? 0}
                      disabled={fieldDisabled}
                      onChange={(e) =>
                        setConfig((c) => ({
                          ...c,
                          financePolicyData: {
                            ...c.financePolicyData,
                            priceAdjustment: {...c.financePolicyData.priceAdjustment, minPercent: Number(e.target.value) || 0},
                          },
                        }))
                      }
                      fullWidth
                      size="small"
                    />
                    <TextField
                      label="% điều chỉnh tối đa"
                      type="number"
                      value={config.financePolicyData.priceAdjustment?.maxPercent ?? 0}
                      disabled={fieldDisabled}
                      onChange={(e) =>
                        setConfig((c) => ({
                          ...c,
                          financePolicyData: {
                            ...c.financePolicyData,
                            priceAdjustment: {...c.financePolicyData.priceAdjustment, maxPercent: Number(e.target.value) || 0},
                          },
                        }))
                      }
                      fullWidth
                      size="small"
                    />
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          )}

          {tabIndex === 3 && (
            <Card sx={{borderRadius: "12px", border: "1px solid rgba(226,232,240,1)", boxShadow: "0 8px 24px rgba(15,23,42,0.06)"}}>
              <CardContent sx={{p: 3}}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{mb: 2}}>
                  <Typography sx={{fontWeight: 800}}>Hồ sơ bắt buộc chung</Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon/>}
                    disabled={fieldDisabled}
                    onClick={addMandatoryDocument}
                    sx={{textTransform: "none", fontWeight: 700, borderRadius: 2}}
                  >
                    Thêm
                  </Button>
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
                          disabled={fieldDisabled}
                          onChange={(e) => {
                            const v = e.target.checked;
                            setConfig((c) => {
                              const list = [...(c.documentRequirementsData.mandatoryAll || [])];
                              list[idx] = {...list[idx], required: v};
                              return {...c, documentRequirementsData: {...c.documentRequirementsData, mandatoryAll: list}};
                            });
                          }}
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
                    disabled={fieldDisabled}
                    onClick={addByMethodGroup}
                    sx={{textTransform: "none", fontWeight: 700, borderRadius: 2}}
                  >
                    Thêm nhóm phương thức
                  </Button>
                </Stack>
               
                {(config.documentRequirementsData.byMethod || []).map((group, gIdx) => {
                  const summaryLabel = group.methodCode?.trim() ? group.methodCode : `Nhóm ${gIdx + 1}`;
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
                          size="small"
                          label="Mã phương thức"
                          value={group.methodCode ?? ""}
                          disabled={fieldDisabled}
                          fullWidth
                          onChange={(e) => {
                            const v = e.target.value;
                            setConfig((c) => {
                              const by = [...(c.documentRequirementsData.byMethod || [])];
                              by[gIdx] = normalizeByMethodGroup({...by[gIdx], methodCode: v});
                              return {...c, documentRequirementsData: {...c.documentRequirementsData, byMethod: by}};
                            });
                          }}
                        />
                        <Box sx={{display: "flex", justifyContent: "flex-end"}}>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<AddIcon/>}
                            disabled={fieldDisabled}
                            onClick={() => addDocumentToMethod(gIdx)}
                            sx={{textTransform: "none", fontWeight: 700, borderRadius: 2}}
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
                                disabled={fieldDisabled}
                                onChange={(e) => {
                                  const v = e.target.checked;
                                  setConfig((c) => {
                                    const by = [...(c.documentRequirementsData.byMethod || [])];
                                    const docs = [...(by[gIdx].documents || [])];
                                    docs[dIdx] = normalizeDocItem({...docs[dIdx], required: v});
                                    by[gIdx] = normalizeByMethodGroup({...by[gIdx], documents: docs});
                                    return {...c, documentRequirementsData: {...c.documentRequirementsData, byMethod: by}};
                                  });
                                }}
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

          {tabIndex === 4 && (
            <Stack spacing={2}>
              <Card sx={{borderRadius: "12px", border: "1px solid rgba(226,232,240,1)", boxShadow: "0 8px 24px rgba(15,23,42,0.06)"}}>
                <CardContent sx={{p: 3}}>
                  <Stack spacing={2}>
                    <TextField
                      label="Hotline"
                      value={config.operationSettingsData.hotline ?? ""}
                      disabled={fieldDisabled}
                      onChange={(e) =>
                        setConfig((c) => ({
                          ...c,
                          operationSettingsData: {...c.operationSettingsData, hotline: e.target.value},
                        }))
                      }
                      fullWidth
                      size="small"
                    />
                    <TextField
                      label="Email hỗ trợ"
                      value={config.operationSettingsData.emailSupport ?? ""}
                      disabled={fieldDisabled}
                      onChange={(e) =>
                        setConfig((c) => ({
                          ...c,
                          operationSettingsData: {...c.operationSettingsData, emailSupport: e.target.value},
                        }))
                      }
                      fullWidth
                      size="small"
                    />
                  </Stack>
                </CardContent>
              </Card>

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
                      disabled={fieldDisabled}
                      value={config.operationSettingsData.workingConfig.regularDays || []}
                      onChange={(e, v) => {
                        if (!v) return;
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
                      disabled={fieldDisabled}
                      value={config.operationSettingsData.workingConfig.weekendDays || []}
                      onChange={(e, v) => {
                        if (!v) return;
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
                          disabled={fieldDisabled}
                          onChange={(e) =>
                            setConfig((c) => ({
                              ...c,
                              operationSettingsData: {
                                ...c.operationSettingsData,
                                workingConfig: {...c.operationSettingsData.workingConfig, isOpenSunday: e.target.checked},
                              },
                            }))
                          }
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
                    disabled={fieldDisabled}
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
                  />

                  <Typography sx={{fontWeight: 800, mt: 3, mb: 1}}>Ca làm việc</Typography>
                  <Stack spacing={1}>
                    {(config.operationSettingsData.workingConfig.workShifts || []).map((sh, idx) => (
                      <Stack key={idx} direction={{xs: "column", sm: "row"}} spacing={1}>
                        <TextField
                          label="Tên ca"
                          size="small"
                          value={sh.name ?? ""}
                          disabled={fieldDisabled}
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
                        />
                        <TextField
                          label="Bắt đầu"
                          type="time"
                          size="small"
                          InputLabelProps={{shrink: true}}
                          value={sh.startTime ?? ""}
                          disabled={fieldDisabled}
                          onChange={(e) => {
                            const v = e.target.value;
                            setConfig((c) => {
                              const ws = [...(c.operationSettingsData.workingConfig.workShifts || [])];
                              ws[idx] = {...ws[idx], startTime: v};
                              return {
                                ...c,
                                operationSettingsData: {
                                  ...c.operationSettingsData,
                                  workingConfig: {...c.operationSettingsData.workingConfig, workShifts: ws},
                                },
                              };
                            });
                          }}
                        />
                        <TextField
                          label="Kết thúc"
                          type="time"
                          size="small"
                          InputLabelProps={{shrink: true}}
                          value={sh.endTime ?? ""}
                          disabled={fieldDisabled}
                          onChange={(e) => {
                            const v = e.target.value;
                            setConfig((c) => {
                              const ws = [...(c.operationSettingsData.workingConfig.workShifts || [])];
                              ws[idx] = {...ws[idx], endTime: v};
                              return {
                                ...c,
                                operationSettingsData: {
                                  ...c.operationSettingsData,
                                  workingConfig: {...c.operationSettingsData.workingConfig, workShifts: ws},
                                },
                              };
                            });
                          }}
                        />
                      </Stack>
                    ))}
                    <Button
                      startIcon={<AddIcon/>}
                      disabled={fieldDisabled}
                      onClick={() =>
                        setConfig((c) => {
                          const ws = [...(c.operationSettingsData.workingConfig.workShifts || []), {name: "", startTime: "08:00", endTime: "17:00"}];
                          return {
                            ...c,
                            operationSettingsData: {
                              ...c.operationSettingsData,
                              workingConfig: {...c.operationSettingsData.workingConfig, workShifts: ws},
                            },
                          };
                        })
                      }
                      sx={{textTransform: "none", alignSelf: "flex-start"}}
                    >
                      Thêm ca
                    </Button>
                  </Stack>
        </CardContent>
      </Card>

              <Card sx={{borderRadius: "12px", border: "1px solid rgba(226,232,240,1)", boxShadow: "0 8px 24px rgba(15,23,42,0.06)"}}>
                <CardContent sx={{p: 3}}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography sx={{fontWeight: 800}}>Quy trình tuyển sinh</Typography>
                    <Button startIcon={<AddIcon/>} disabled={fieldDisabled} onClick={addAdmissionStep} sx={{textTransform: "none"}}>
                      Thêm bước
                    </Button>
                  </Stack>
                  <Stack spacing={2}>
                    {(config.operationSettingsData.admissionSteps || []).map((step, idx) => (
                      <Card key={idx} variant="outlined" sx={{borderRadius: 2}}>
                        <CardContent sx={{py: 1.5}}>
                          <Stack direction="row" spacing={1} alignItems="flex-start">
                            <Box sx={{flex: 1}}>
                              <Stack spacing={2}>
                                <Chip size="small" label={`Bước ${step.stepOrder ?? idx + 1}`} sx={{alignSelf: "flex-start"}}/>
                                <Stack spacing={1}>
                                  <TextField
                                    label="Tên bước"
                                    size="small"
        fullWidth
                                    value={step.stepName ?? ""}
                                    disabled={fieldDisabled}
                                    onChange={(e) => updateStep(idx, "stepName", e.target.value)}
                                  />
                                  <TextField
                                    label="Mô tả"
                                    size="small"
                                    fullWidth
                                    multiline
                                    minRows={2}
                                    value={step.description ?? ""}
                                    disabled={fieldDisabled}
                                    onChange={(e) => updateStep(idx, "description", e.target.value)}
                                  />
                                </Stack>
                              </Stack>
                            </Box>
          <IconButton
                              size="small"
                              color="error"
                              disabled={fieldDisabled}
                              onClick={() => removeStep(idx)}
                              aria-label="Xoá bước"
                              sx={{alignSelf: "flex-start", mt: 0.25}}
                            >
                              <DeleteOutlineIcon fontSize="small"/>
          </IconButton>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          )}

          {tabIndex === 5 && (
            <SchoolFacilityFacilityForm
              ref={facilityFormRef}
              value={config.facilityData}
              onChange={(next) => setConfig((c) => ({...c, facilityData: next}))}
              loading={loading}
              saving={saving}
              readOnly={fieldDisabled}
            />
          )}
            </>
          )}
        </Box>

        <Box sx={{mt: 2, display: "flex", justifyContent: "flex-end", gap: 1, flexWrap: "wrap"}}>
          {!editing ? (
            <Button variant="contained" onClick={() => setEditing(true)} disabled={loading || saving} sx={footerSaveSx}>
              Chỉnh sửa
            </Button>
          ) : (
            <>
              <Button variant="outlined" onClick={handleReset} disabled={loading || saving} sx={footerCancelSx}>
                Huỷ
              </Button>
              <Button variant="contained" onClick={handleSave} disabled={loading || saving || !isDirty} sx={footerSaveSx}>
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
