import axiosClient from '../configs/APIConfig.jsx';

export const getParentStudent = async () => {
    const response = await axiosClient.get('/parent/student');
    return response || null;
};

/**
 * Chi tiết một hồ sơ học sinh (GET /parent/student/{id}) — dùng cho panel « i »; BE tách khỏi payload history chat.
 * TVV có thể gọi cùng endpoint nếu BE cho phép role COUNSELLOR.
 */
export const getParentStudentById = async (studentProfileId) => {
    const id = studentProfileId != null ? String(studentProfileId).trim() : '';
    if (!id) {
        throw new Error('studentProfileId is required');
    }
    const response = await axiosClient.get(`/parent/student/${encodeURIComponent(id)}`, {
        headers: {'X-Device-Type': 'web'},
    });
    return response || null;
};

/**
 * Trích object hồ sơ từ envelope API (message + body, hoặc body là chuỗi JSON).
 * Dùng chung cho GET /parent/student/{id} và GET counsellor tương ứng nếu cùng shape.
 */
export function pickStudentDetailBodyFromResponse(response) {
    const data = response?.data;
    if (data == null) return null;
    let inner = data.body ?? data;
    if (typeof inner === 'string') {
        try {
            inner = JSON.parse(inner);
        } catch {
            return null;
        }
    }
    if (inner && typeof inner === 'object' && inner.body != null && typeof inner.body === 'object' && !Array.isArray(inner.body)) {
        inner = inner.body;
    }
    return inner && typeof inner === 'object' && !Array.isArray(inner) ? inner : null;
}

/**
 * Map body chi tiết (GET /parent/student/{id}) → state panel chat (cùng các field Header/counsellor đang dùng).
 */
export function normalizeStudentDetailBodyForPanel(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
    const subjectsInSystem = Array.isArray(body.subjectsInSystem) ? body.subjectsInSystem : [];
    const pid = body.id ?? body.studentProfileId ?? body.studentId ?? null;
    const childName = String(body.childName ?? body.studentName ?? body.StudentName ?? '').trim();
    const studentName = String(body.studentName ?? body.childName ?? childName).trim();
    const pCode = body.personalityCode ?? body.personalityTypeCode ?? body.personalityType?.code ?? '';
    return {
        ...body,
        studentProfileId: pid != null ? String(pid) : '',
        childName: childName || studentName,
        studentName: studentName || childName,
        personalityCode: pCode,
        personalityTypeCode: body.personalityTypeCode ?? body.personalityCode ?? pCode,
        traits: Array.isArray(body.traits) ? body.traits : [],
        academicProfileMetadata: Array.isArray(body.academicProfileMetadata) ? body.academicProfileMetadata : [],
        academicInfos: Array.isArray(body.academicInfos) ? body.academicInfos : [],
        favouriteJob: body.favouriteJob ?? body.favoriteJob ?? '',
        gender: body.gender ?? '',
        subjectsInSystem,
    };
}

/** Danh sách hồ sơ học sinh của phụ huynh (GET /parent/student) — cùng endpoint với {@link getParentStudent}. */
export const getStudents = async () => getParentStudent();

export const postParentStudent = async (payload) => {
    const response = await axiosClient.post('/parent/student', payload);
    return response || null;
};

export const putParentStudent = async (payload) => {
    const response = await axiosClient.put('/parent/student', payload);
    return response || null;
};

export const getParentPersonalityTypes = async () => {
    const response = await axiosClient.get('/parent/personality/type');
    return response || null;
};

export const getParentMajors = async () => {
    const response = await axiosClient.get('/parent/major');
    return response || null;
};

export const getParentSubjects = async () => {
    const response = await axiosClient.get('/parent/subject');
    return response || null;
};

export const postParentFavouriteSchool = async (payload) => {
    const response = await axiosClient.post('/parent/favourite/school', payload);
    return response || null;
};

export const getParentFavouriteSchools = async (page = 0, pageSize = 10) => {
    const response = await axiosClient.get('/parent/favourite/school', {
        params: {page, pageSize},
    });
    return response || null;
};

export const deleteParentFavouriteSchool = async (schoolId) => {
    const response = await axiosClient.delete(`/parent/favourite/school/${schoolId}`);
    return response || null;
};
