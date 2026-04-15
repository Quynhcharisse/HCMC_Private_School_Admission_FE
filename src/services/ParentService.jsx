import axiosClient from '../configs/APIConfig.jsx';

export const getParentStudent = async () => {
    const response = await axiosClient.get('/parent/student');
    return response || null;
};

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
