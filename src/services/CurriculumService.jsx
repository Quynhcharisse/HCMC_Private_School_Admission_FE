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
 * Create (curriculumId absent) or Update draft (send curriculumId).
 * @param {Object} payload
 * @param {number|null} [payload.curriculumId] - null = create, set = update/evolve
 * @param {string} payload.subTypeName
 * @param {string} payload.description
 * @param {string} payload.curriculumType
 * @param {string} payload.methodLearning
 * @param {number} payload.enrollmentYear
 * @param {Array<{name:string, description:string, isMandatory:boolean}>} payload.subjectOptions
 */
export const saveCurriculum = async ({
    curriculumId = null,
    subTypeName,
    description,
    curriculumType,
    methodLearning,
    enrollmentYear,
    subjectOptions,
}) => {
    const body = {
        subTypeName,
        description,
        curriculumType,
        methodLearning,
        enrollmentYear,
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
 * Perform curriculum status action by curriculumId.
 *
 * @param {number|string} id
 * @param {"PUBLISH"|"REVISE"} action
 */
export const activateCurriculum = async (id, action) => {
    const response = await axiosClient.patch(`/school/${id}/activate/curriculum`, {}, {
        params: { action },
        headers: {
            "X-Device-Type": "web",
        },
    });
    return response || null;
};
