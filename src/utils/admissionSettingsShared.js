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
  const methodDocumentRequirements = Array.isArray(adm.methodDocumentRequirements)
    ? adm.methodDocumentRequirements
        .map((group) => {
          const methodCode = String(group?.methodCode ?? "").trim();
          const documents = Array.isArray(group?.documents)
            ? group.documents
                .map((doc) => ({
                  code: String(doc?.code ?? "").trim(),
                  name: doc?.name != null ? String(doc.name) : "",
                  required: doc?.required === true,
                }))
                .filter((doc) => doc.code || doc.name)
            : [];
          return {methodCode, documents};
        })
        .filter((group) => group.methodCode || group.documents.length > 0)
    : [];
  const autoCloseOnFull = typeof adm.autoCloseOnFull === "boolean" ? adm.autoCloseOnFull : true;
  const quotaAlertThresholdPercentRaw = Number(adm.quotaAlertThresholdPercent);
  const quotaAlertThresholdPercent = Number.isNaN(quotaAlertThresholdPercentRaw)
    ? 90
    : Math.min(100, Math.max(0, quotaAlertThresholdPercentRaw));
  const allowedMethodCodeSet = new Set(methods.map((m) => String(m.code || "").trim()).filter(Boolean));
  const filteredAdmissionProcesses = methodAdmissionProcess.filter((row) => {
    const code = String(row?.methodCode || "").trim();
    return code && allowedMethodCodeSet.has(code);
  });
  const filteredMethodDocumentRequirements = methodDocumentRequirements.filter((group) => {
    const code = String(group?.methodCode || "").trim();
    return code && allowedMethodCodeSet.has(code);
  });
  return {
    allowedMethods: methods,
    // BE PUT contract uses `admissionProcesses`.
    admissionProcesses: filteredAdmissionProcesses,
    // Keep this key for backward-compatible BE readers if any.
    methodAdmissionProcess: filteredAdmissionProcesses,
    methodDocumentRequirements: filteredMethodDocumentRequirements,
    autoCloseOnFull,
    quotaAlertThresholdPercent,
  };
}

export function admissionSettingsComparableJson(adm) {
  try {
    return JSON.stringify(sanitizeAdmissionSettingsForApi(adm));
  } catch {
    return "";
  }
}
