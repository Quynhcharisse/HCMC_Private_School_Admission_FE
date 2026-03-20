const NAMESPACE = "edubridge";
const STORAGE_PREFIX = "savedSchools";

function safeString(v) {
    return v === undefined || v === null ? "" : String(v);
}

export function getUserIdentity(userInfo) {
    const identity =
        userInfo?.email ??
        userInfo?.username ??
        userInfo?.userName ??
        userInfo?.sub ??
        "";
    return safeString(identity).trim().toLowerCase();
}

export function getSavedSchoolsStorageKey(userInfo) {
    const identity = getUserIdentity(userInfo);
    // Fallback để tránh đụng key khi chưa có identity (không nên xảy ra ở role PARENT).
    return `${NAMESPACE}:${STORAGE_PREFIX}:${identity || "unknown"}`;
}

export function getSavedSchools(userInfo) {
    if (typeof window === "undefined") return [];
    if (!userInfo) return [];

    const key = getSavedSchoolsStorageKey(userInfo);
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

export function setSavedSchools(userInfo, schools) {
    if (typeof window === "undefined") return;
    if (!userInfo) return;

    const key = getSavedSchoolsStorageKey(userInfo);
    localStorage.setItem(key, JSON.stringify(Array.isArray(schools) ? schools : []));
}

export function getSchoolStorageKey({province, ward, school}) {
    return `${safeString(province)}||${safeString(ward)}||${safeString(school)}`;
}

