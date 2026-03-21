import axiosClient from "../configs/APIConfig.jsx";

/**
 * GET /api/v1/school/program/list
 * @param {number} page - zero-based page index
 * @param {number} pageSize - items per page
 */
export const getProgramList = async (page = 0, pageSize = 10) => {
    const response = await axiosClient.get("/school/program/list", {
        params: { page, pageSize },
    });
    return response || null;
};

/**
 * POST /api/v1/school/program
 * Create: omit programId (or programId <= 0). Update: include programId > 0.
 */
export const saveProgram = async ({
    programId,
    curriculumId,
    graduationStandard,
    targetStudentDescription,
    baseTuitionFee,
    isActive,
}) => {
    const body = {
        curriculumId,
        graduationStandard,
        targetStudentDescription,
        baseTuitionFee: Number(baseTuitionFee),
        isActive: !!isActive,
    };

    const id = programId != null ? Number(programId) : 0;
    if (Number.isFinite(id) && id > 0) {
        body.programId = id;
    }

    const response = await axiosClient.post("/school/program", body, {
        headers: {
            "X-Device-Type": "web",
        },
    });
    return response || null;
};

