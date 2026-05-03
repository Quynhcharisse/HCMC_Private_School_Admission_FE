export const adminSchoolDisplayNameStorageKey = (schoolId) =>
    schoolId == null || schoolId === "" ? "" : `adminSchoolDisplayName:${schoolId}`;

export const adminCampusDisplayNameStorageKey = (campusId) =>
    campusId == null || campusId === "" ? "" : `adminCampusDisplayName:${campusId}`;
