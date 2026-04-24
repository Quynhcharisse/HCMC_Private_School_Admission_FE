/**
 * Chuẩn hoá payload PUT admissionSettingsData (trường + nền tảng).
 * @param {Record<string, unknown>} adm
 */
export function sanitizeAdmissionSettingsForApi(adm) {
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
  const methodAdmissionProcess = Array.isArray(adm.methodAdmissionProcess)
    ? adm.methodAdmissionProcess
        .map((g) => {
          const methodCode = String(g?.methodCode ?? "").trim();
          const steps = Array.isArray(g?.steps)
            ? g.steps.map((s, idx) => ({
                stepName: s?.stepName != null ? String(s.stepName) : "",
                stepOrder: s?.stepOrder != null && !Number.isNaN(Number(s.stepOrder)) ? Number(s.stepOrder) : idx + 1,
                description: s?.description != null ? String(s.description) : "",
              }))
            : [];
          return {methodCode, steps};
        })
        .filter((row) => row.methodCode !== "" || row.steps.length > 0)
    : [];
  return {
    allowedMethods: methods,
    methodAdmissionProcess,
    autoCloseOnFull: typeof adm.autoCloseOnFull === "boolean" ? adm.autoCloseOnFull : true,
    quotaAlertThresholdPercent:
      adm.quotaAlertThresholdPercent != null && !Number.isNaN(Number(adm.quotaAlertThresholdPercent))
        ? Number(adm.quotaAlertThresholdPercent)
        : 90,
  };
}

/** So sánh hai bản admission (sau sanitize) — dùng badge «giống mẫu» / «đã tùy chỉnh». */
export function admissionSettingsComparableJson(adm) {
  try {
    return JSON.stringify(sanitizeAdmissionSettingsForApi(adm));
  } catch {
    return "";
  }
}
