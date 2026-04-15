const LOCATION_FALLBACK_PROVINCE = "Tất cả";
const LOCATION_FALLBACK_WARD = "Tất cả";
const HO_CHI_MINH_CANONICAL = "Hồ Chí Minh";

const normalizeLocationToken = (value) =>
    String(value || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[\s._-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

const HO_CHI_MINH_ALIASES = new Set([
    "ho chi minh",
    "ho chi minh city",
    "hcm",
    "hcm city",
    "tp hcm",
    "tphcm",
    "thanh pho ho chi minh",
    "thanh pho hcm"
]);

export function normalizeProvinceName(value) {
    const trimmed = String(value || "").trim();
    if (!trimmed) return "";
    const normalizedToken = normalizeLocationToken(trimmed);
    if (HO_CHI_MINH_ALIASES.has(normalizedToken)) {
        return HO_CHI_MINH_CANONICAL;
    }
    return trimmed;
}

export const DEFAULT_SCHOOL_IMAGE =
    "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=900&q=80";

export function mapPublicSchoolDetailToRow(api) {
    if (!api || typeof api !== "object") return null;
    const campusList = Array.isArray(api.campusList) ? api.campusList : [];
    const firstCampus = campusList[0] ?? null;
    const consultantEmails = campusList
        .flatMap((campus) => (Array.isArray(campus?.consultantEmails) ? campus.consultantEmails : []))
        .map((email) => String(email || "").trim())
        .filter(Boolean);
    const primaryConsultantEmail = consultantEmails[0] || "";
    const normalizedProvince = normalizeProvinceName(firstCampus?.city || "");
    const province = normalizedProvince || LOCATION_FALLBACK_PROVINCE;
    const ward = (firstCampus?.district || "").trim() || LOCATION_FALLBACK_WARD;
    return {
        id: api.id,
        school: api.name ?? "",
        province,
        ward,
        website: api.websiteUrl || "",
        phone: firstCampus?.phoneNumber || api.hotline || "",
        email: primaryConsultantEmail || firstCampus?.email || api.email || api.schoolEmail || api.accountEmail || "",
        counsellorEmail:
            primaryConsultantEmail ||
            firstCampus?.counsellorEmail ||
            api.counsellorEmail ||
            "",
        consultantEmails,
        address: firstCampus?.address || (api.description ? String(api.description) : "Đang cập nhật"),
        locationLabel: province,
        description: api.description,
        averageRating: typeof api.averageRating === "number" ? api.averageRating : 0,
        totalCampus: api.totalCampus ?? campusList.length,
        logoUrl: api.logoUrl || null,
        isFavourite: Boolean(api.isFavourite),
        foundingDate: api.foundingDate,
        representativeName: api.representativeName,
        campusList,
        curriculumList: Array.isArray(api.curriculumList) ? api.curriculumList : [],
        boardingType: firstCampus?.boardingType || "",
        primaryCampusId: firstCampus?.id != null ? Number(firstCampus.id) : null,
        hasDetailLoaded: true
    };
}
