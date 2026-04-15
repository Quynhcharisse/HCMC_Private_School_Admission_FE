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
 * POST /api/v1/school/program (Upsert)
 * - Create: omit `programId`
 * - Update: include `programId`
 */
export const saveProgram = async ({
    programId,
    curriculumId,
    name,
    languageOfInstructionList,
    graduationStandard,
    targetStudentDescription,
    baseTuitionFee,
    feeUnit,
    extraSubjectList,
}) => {
    const body = {
        curriculumId,
        name: name != null ? String(name).trim() : "",
        languageOfInstructionList: Array.isArray(languageOfInstructionList)
            ? languageOfInstructionList.filter(Boolean)
            : [],
        graduationStandard,
        targetStudentDescription,
        baseTuitionFee: Number(baseTuitionFee),
        feeUnit: feeUnit ?? null,
        extraSubjectList: Array.isArray(extraSubjectList) ? extraSubjectList : [],
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

/**
 * PATCH /api/v1/school/{id}/activate/program?action=ACTIVATE|DEACTIVATE
 */
export const handleProgramAction = async (id, action) => {
    const programId = Number(id);
    const safeAction = String(action || "").toUpperCase();
    const response = await axiosClient.patch(
        `/school/${programId}/activate/program`,
        {},
        {
            params: { action: safeAction },
            headers: { "X-Device-Type": "web" },
        }
    );
    return response || null;
};

/**
 * POST /api/v1/school/{id}/program/clone
 * `id` là program gốc cần nhân bản (không phải campaign template).
 */
export const cloneProgram = async (id) => {
    const programId = Number(id);
    const response = await axiosClient.post(`/school/${programId}/program/clone`, null, {
        headers: { "X-Device-Type": "web" },
    });
    return response || null;
};

