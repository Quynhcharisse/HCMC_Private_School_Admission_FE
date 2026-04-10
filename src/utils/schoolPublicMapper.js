const LOCATION_FALLBACK_PROVINCE = "Tất cả";
const LOCATION_FALLBACK_WARD = "Tất cả";

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
    const province = (firstCampus?.city || "").trim() || LOCATION_FALLBACK_PROVINCE;
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
