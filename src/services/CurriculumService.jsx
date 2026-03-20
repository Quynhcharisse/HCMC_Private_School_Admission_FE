import axiosClient from "../configs/APIConfig.jsx";

/**
 * GET /api/v1/school/curriculum/list
 * @param {number} page - zero-based page index
 * @param {number} pageSize - items per page
 */
export const getCurriculumList = async (page = 0, pageSize = 10) => {
    const response = await axiosClient.get("/school/curriculum/list", {
        params: { page, pageSize },
    });
    return response || null;
};

/**
 * POST /api/v1/school/curriculum
 * Create (curriculumId null) or Update/Evolve (send curriculumId).
 * BE: Create → draft or active by publishNow; Update draft → overwrite; Update active → new version, old archived.
 * @param {Object} payload
 * @param {number|null} [payload.curriculumId] - null = create, set = update/evolve
 * @param {string} payload.subTypeName
 * @param {string} payload.description
 * @param {string} payload.curriculumType
 * @param {string} payload.methodLearning
 * @param {number} payload.enrollmentYear
 * @param {boolean} payload.publishNow
 * @param {Array<{name:string, description:string, isMandatory:boolean}>} payload.subjectOptions
 */
export const saveCurriculum = async ({
    curriculumId = null,
    subTypeName,
    description,
    curriculumType,
    methodLearning,
    enrollmentYear,
    publishNow,
    subjectOptions,
}) => {
    const body = {
        subTypeName,
        description,
        curriculumType,
        methodLearning,
        enrollmentYear,
        publishNow: !!publishNow,
        subjectOptions: subjectOptions || [],
    };
    // BE: curriculumId = 0 (hoặc không truyền) => tạo mới DRAFT
    const numericId = curriculumId === null || curriculumId === undefined || curriculumId === "" ? null : Number(curriculumId);
    if (numericId !== null && !Number.isNaN(numericId) && numericId !== 0) {
        body.curriculumId = numericId;
    }
    const response = await axiosClient.post("/school/curriculum", body, {
        headers: {
            "X-Device-Type": "web",
        },
    });
    return response || null;
};

/**
 * PATCH /api/v1/school/{id}/activate/curriculum
 * Activate (publish) a curriculum by its curriculumId.
 *
 * @param {number|string} id
 */
export const activateCurriculum = async (id) => {
    const response = await axiosClient.patch(`/school/${id}/activate/curriculum`, {}, {
        headers: {
            "X-Device-Type": "web",
        },
    });
    return response || null;
};
