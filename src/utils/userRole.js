export function normalizeUserRole(raw) {
    if (raw == null) return "";
    if (Array.isArray(raw)) {
        const first = raw.find((x) => x != null && String(x).trim() !== "");
        return first != null ? normalizeUserRole(first) : "";
    }
    const s = String(raw).trim();
    if (!s) return "";
    const u = s.toUpperCase().replace(/^ROLE_/, "");
    const map = {
        ADMIN: "ADMIN",
        ADMINISTRATOR: "ADMIN",
        SCHOOL: "SCHOOL",
        PARENT: "PARENT",
        COUNSELLOR: "COUNSELLOR",
        COUNSELOR: "COUNSELLOR",
        STUDENT: "STUDENT"
    };
    if (map[u]) return map[u];
    if (["ADMIN", "SCHOOL", "PARENT", "COUNSELLOR", "STUDENT"].includes(u)) return u;
    return u;
}

export function pickRoleFromAccessBody(body) {
    if (!body || typeof body !== "object") return null;
    const direct =
        body.role ??
        body.userRole ??
        body.accountRole ??
        body.user?.role ??
        body.account?.role;
    if (direct != null && String(direct).trim() !== "") return direct;
    if (Array.isArray(body.roles) && body.roles.length) return body.roles[0];
    if (Array.isArray(body.authorities) && body.authorities.length) {
        const a = body.authorities[0];
        if (typeof a === "string") return a;
        if (a && typeof a === "object" && a.authority) return a.authority;
    }
    return null;
}
