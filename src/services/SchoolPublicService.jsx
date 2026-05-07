import axiosClient from "../configs/APIConfig.jsx";

export async function getPublicSchoolList() {
    const response = await axiosClient.get("/school/public/list");
    const body = response?.data?.body;
    if (Array.isArray(body)) return body;
    return [];
}


export async function getPublicSchoolDetail(schoolId) {
    if (schoolId === undefined || schoolId === null) return null;
    const response = await axiosClient.get(`/school/${schoolId}/public/detail`);
    return response?.data?.body ?? null;
}

export async function getPublicSchoolCampaignTemplates(schoolId, year = 0) {
    if (schoolId === undefined || schoolId === null) return [];
    const response = await axiosClient.get(`/school/${schoolId}/campaign/template/public`, {
        params: {year: Number(year) || 0}
    });
    const body = response?.data?.body;
    const normalizeMethodTimeline = (item) => {
        if (!item || typeof item !== "object") return null;
        return {
            ...item,
            methodCode: item?.methodCode ?? item?.code ?? "",
            displayName: item?.displayName ?? item?.name ?? item?.methodCode ?? "",
            description: item?.description ?? "",
            admissionProcessSteps: Array.isArray(item?.admissionProcessSteps) ? item.admissionProcessSteps : [],
            methodDocumentRequirements: Array.isArray(item?.methodDocumentRequirements)
                ? item.methodDocumentRequirements
                : []
        };
    };

    const normalizeCampaign = (campaign, mandatoryAll) => {
        if (!campaign || typeof campaign !== "object") return null;
        const mappedTimelines = Array.isArray(campaign?.admissionMethodTimelines)
            ? campaign.admissionMethodTimelines.map(normalizeMethodTimeline).filter(Boolean)
            : [];
        return {
            ...campaign,
            admissionMethodDetails: mappedTimelines,
            mandatoryAll: Array.isArray(campaign?.mandatoryAll)
                ? campaign.mandatoryAll
                : Array.isArray(mandatoryAll)
                    ? mandatoryAll
                    : []
        };
    };

    if (Array.isArray(body)) {
        return body.map((campaign) => normalizeCampaign(campaign, campaign?.mandatoryAll)).filter(Boolean);
    }
    if (body && typeof body === "object") {
        const campaigns = Array.isArray(body?.campaigns) ? body.campaigns : [];
        const mandatoryAll = Array.isArray(body?.campaignConfig?.mandatoryAll)
            ? body.campaignConfig.mandatoryAll
            : [];
        return campaigns.map((campaign) => normalizeCampaign(campaign, mandatoryAll)).filter(Boolean);
    }
    return [];
}

export async function searchNearbyCampuses({lat, lng, radius = 10}) {
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return [];
    const params = {
        lat: Number(lat),
        lng: Number(lng),
        radius: Number(radius)
    };
    const endpoints = [
        "/school/campus/search/nearby",
        "/campus/search-nearby"
    ];
    const pickBodyList = (response) => {
        const body = response?.data?.body;
        if (Array.isArray(body)) return body;
        if (Array.isArray(body?.items)) return body.items;
        if (Array.isArray(body?.content)) return body.content;
        if (Array.isArray(body?.campusList)) return body.campusList;
        return [];
    };

    let lastError = null;
    for (const endpoint of endpoints) {
        try {
            const response = await axiosClient.get(endpoint, {params});
            return pickBodyList(response);
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError ?? new Error("Không gọi được API tìm campus lân cận.");
}

export async function getLanguageOptions() {
    const response = await axiosClient.get("/school/public/language-options");
    const body = response?.data?.body;
    if (Array.isArray(body)) return body;
    return [];
}
