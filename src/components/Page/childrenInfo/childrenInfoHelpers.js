export const genderOptions = [
    {value: 'MALE', label: 'Nam'},
    {value: 'FEMALE', label: 'Nữ'},
    {value: 'OTHER', label: 'Khác'},
];

/** Cột điểm nội bộ + nhãn UI + enum gửi/nhận API */
export const GRADE_LEVELS = [
    {key: 'g06', label: 'Lớp 06', gradeLevelEnum: 'GRADE_06'},
    {key: 'g07', label: 'Lớp 07', gradeLevelEnum: 'GRADE_07'},
    {key: 'g08', label: 'Lớp 08', gradeLevelEnum: 'GRADE_08'},
    {key: 'g09', label: 'Lớp 09', gradeLevelEnum: 'GRADE_09'},
];

export function emptyGrades() {
    return {g06: '', g07: '', g08: '', g09: ''};
}

export function normalizeSubjectGroups(body) {
    if (body == null) return [];
    if (Array.isArray(body)) return body;
    if (Array.isArray(body.subjects)) return body.subjects;
    if (Array.isArray(body.groups)) return body.groups;
    return [];
}

export function parseBody(res) {
    const raw = res?.data?.body;
    if (raw == null) return res?.data ?? null;
    if (typeof raw === 'string') {
        try {
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }
    return raw;
}

/** GET có thể trả `body` là mảng một phần tử thay vì object */
export function unwrapStudentRecord(input) {
    if (input == null) return null;
    if (Array.isArray(input)) {
        return input.length ? input[0] : null;
    }
    return input;
}

export function normalizePersonalityGroups(body) {
    if (body == null) return null;
    if (Array.isArray(body)) {
        return body.length ? {'Danh sách': body} : null;
    }
    if (typeof body === 'object') {
        const hasArray = Object.values(body).some((v) => Array.isArray(v) && v.length > 0);
        return hasArray ? body : null;
    }
    return null;
}

export function findPersonalityById(groups, idStr) {
    if (!groups || idStr === '' || idStr == null) return null;
    for (const items of Object.values(groups)) {
        if (!Array.isArray(items)) continue;
        const found = items.find((x) => String(x?.id) === String(idStr));
        if (found) return found;
    }
    return null;
}

/** Tìm MBTI theo mã (code) khi API trả `personalityTypeCode` thay vì id */
export function findPersonalityByCode(groups, codeStr) {
    if (!groups || codeStr === '' || codeStr == null) return null;
    const c = String(codeStr).trim();
    for (const items of Object.values(groups)) {
        if (!Array.isArray(items)) continue;
        const found = items.find(
            (x) =>
                (x?.code != null && String(x.code).trim() === c) ||
                String(x?.id) === c,
        );
        if (found) return found;
    }
    return null;
}

function parseScoreForPayload(val) {
    if (val === '' || val == null) return null;
    if (typeof val === 'number' && Number.isFinite(val)) return val;
    const s = String(val).trim().replace(',', '.');
    if (s === '') return null;
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
}

/** API `favouriteJob` là chuỗi — gửi tên ngành nếu tìm được, không thì mã */
export function resolveFavouriteJobString(favoriteMajorCodes, majorGroups) {
    if (!favoriteMajorCodes?.length) return '';
    const code = favoriteMajorCodes[0];
    const list = Array.isArray(majorGroups) ? majorGroups : [];
    for (const g of list) {
        const majors = g?.majors;
        if (!Array.isArray(majors)) continue;
        const m = majors.find(
            (x) => Number(x?.code) === Number(code) || String(x?.code) === String(code),
        );
        if (m?.name != null && String(m.name).trim() !== '') return String(m.name);
    }
    return String(code);
}

/** Chuyển `gradeLevel` từ API (GRADE_06, "06", g06…) → key nội bộ g06…g09 */
export function gradeLevelApiToKey(gl) {
    const s = String(gl ?? '').trim();
    if (!s) return null;
    const gradeEnum = s.match(/^GRADE_(\d{2})$/i);
    if (gradeEnum) return `g${gradeEnum[1]}`;
    if (/^g\d{2}$/i.test(s)) return s.toLowerCase();
    const digits = s.replace(/\D/g, '');
    if (!digits) return null;
    const two = digits.length === 1 ? `0${digits}` : digits.slice(-2);
    if (/^\d{2}$/.test(two)) return `g${two}`;
    return null;
}

/**
 * Đổ `academicInfos` từ GET vào state điểm (sau khi đã có danh sách môn).
 */
export function mergeAcademicInfosIntoGrades(academicInfos, regularSubjects, foreignSubjects) {
    const regularGrades = {};
    (regularSubjects || []).forEach((s) => {
        regularGrades[String(s.id)] = emptyGrades();
    });

    let foreignRows = [{rowId: 'foreign-0', subjectId: ''}];
    const foreignGrades = {'foreign-0': emptyGrades()};

    const ensureForeignRowForSubjectId = (subjectId) => {
        const sid = Number(subjectId);
        const existing = foreignRows.find(
            (r) =>
                r.subjectId !== '' &&
                (Number(r.subjectId) === sid || String(r.subjectId) === String(sid)),
        );
        if (existing) return existing.rowId;
        const rowId = `foreign-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        foreignRows.push({rowId, subjectId: sid});
        foreignGrades[rowId] = emptyGrades();
        return rowId;
    };

    if (!Array.isArray(academicInfos)) {
        return {regularGrades, foreignRows, foreignGrades};
    }

    for (const ai of academicInfos) {
        const key = gradeLevelApiToKey(ai.gradeLevel);
        if (!key) continue;
        const rows = ai.subjectResults ?? ai.subjectResultList ?? ai.results ?? [];
        for (const sr of rows) {
            const nameRaw = sr?.subjectName ?? sr?.name ?? sr?.subject;
            if (!sr || nameRaw == null || String(nameRaw).trim() === '') continue;
            const name = String(nameRaw).trim();
            const scoreRaw =
                sr.score ?? sr.subjectScore ?? sr.point ?? sr.grade ?? sr.mark;
            const scoreStr =
                scoreRaw != null && scoreRaw !== '' ? String(scoreRaw) : '';
            const reg = (regularSubjects || []).find((x) => String(x.name).trim() === name);
            if (reg) {
                const id = String(reg.id);
                if (!regularGrades[id]) regularGrades[id] = emptyGrades();
                regularGrades[id][key] = scoreStr;
                continue;
            }
            const forSub = (foreignSubjects || []).find((x) => String(x.name).trim() === name);
            if (forSub) {
                const rowId = ensureForeignRowForSubjectId(forSub.id);
                foreignGrades[rowId][key] = scoreStr;
            }
        }
    }

    return {regularGrades, foreignRows, foreignGrades};
}

function normalizeGradeObject(v) {
    const e = emptyGrades();
    if (!v || typeof v !== 'object') return e;
    GRADE_LEVELS.forEach(({key}) => {
        const x = v[key];
        if (x != null && x !== '') e[key] = String(x);
    });
    return e;
}

export function normalizeRegularGradesFromApi(input) {
    if (!input) return {};
    if (Array.isArray(input)) {
        const out = {};
        input.forEach((row) => {
            const id = row.subjectId ?? row.id;
            if (id == null) return;
            const src = row.grades && typeof row.grades === 'object' ? row.grades : row;
            out[String(id)] = normalizeGradeObject(src);
        });
        return out;
    }
    if (typeof input === 'object') {
        const out = {};
        for (const [k, v] of Object.entries(input)) {
            if (v != null && typeof v === 'object') {
                out[String(k)] = normalizeGradeObject(v);
            }
        }
        return out;
    }
    return {};
}

export function normalizeForeignFromApi(input) {
    const defaultRows = [{rowId: 'foreign-0', subjectId: ''}];
    if (!Array.isArray(input) || input.length === 0) {
        return {rows: defaultRows, grades: {}};
    }
    const rows = [];
    const grades = {};
    input.forEach((row, idx) => {
        const rowId =
            row.rowId != null && String(row.rowId).length > 0
                ? String(row.rowId)
                : `foreign-${idx}`;
        rows.push({
            rowId,
            subjectId:
                row.subjectId != null && row.subjectId !== ''
                    ? Number(row.subjectId)
                    : '',
        });
        const src = row.grades && typeof row.grades === 'object' ? row.grades : row;
        grades[rowId] = normalizeGradeObject(src);
    });
    return {rows, grades};
}

export function getEmptyStudentState() {
    return {
        form: {name: '', gender: ''},
        selectedPersonalityId: '',
        favoriteMajorCodes: [],
        regularGrades: {},
        foreignRows: [{rowId: 'foreign-0', subjectId: ''}],
        foreignGrades: {},
        pendingAcademicInfos: null,
        pendingFavouriteJobLabel: null,
    };
}

export function applyStudentBodyToState(body) {
    let raw = body?.student ?? body?.data?.student ?? body?.data ?? body;
    raw = unwrapStudentRecord(raw);
    if (!raw || typeof raw !== 'object') {
        return getEmptyStudentState();
    }
    const name = raw.studentName ?? raw.name ?? raw.fullName ?? '';
    const gender = raw.gender != null ? String(raw.gender) : '';

    const pid =
        raw.personalityTypeId ?? raw.personalityId ?? raw.mbtiTypeId ?? raw.personalityTypeCode;
    const selectedPersonalityId =
        pid != null && String(pid).trim() !== '' ? String(pid).trim() : '';

    const majors = raw.favoriteMajorCodes ?? raw.majorCodes ?? raw.favoriteMajors;
    let favoriteMajorCodes = Array.isArray(majors)
        ? majors
              .map((x) => Number(x))
              .filter((n) => !Number.isNaN(n))
              .slice(0, 1)
        : [];

    const favRaw = raw.favouriteJob ?? raw.favoriteJob;
    const favStr = favRaw != null ? String(favRaw).trim() : '';
    if (!favoriteMajorCodes.length && favStr) {
        if (/^\d+(\.\d+)?$/.test(favStr)) {
            const n = Number(favStr);
            if (!Number.isNaN(n)) favoriteMajorCodes = [n];
        }
    }

    /** GET có thể dùng `academicProfileMetadata` thay cho `academicInfos` */
    const academicInfosFromApi =
        Array.isArray(raw.academicInfos) && raw.academicInfos.length > 0
            ? raw.academicInfos
            : Array.isArray(raw.academicProfileMetadata) &&
                raw.academicProfileMetadata.length > 0
              ? raw.academicProfileMetadata
              : null;

    const hasAcademicInfos = academicInfosFromApi != null;

    const hasLegacyGrades =
        raw.regularGrades != null ||
        raw.regularSubjectGrades != null ||
        raw.schoolReport?.regular != null;
    const hasLegacyForeign =
        raw.foreignLanguages != null ||
        raw.foreignLanguageRows != null ||
        raw.schoolReport?.foreignLanguages != null;

    let regularGrades = {};
    let foreignRows = [{rowId: 'foreign-0', subjectId: ''}];
    let foreignGrades = {'foreign-0': emptyGrades()};
    let pendingAcademicInfos = null;
    let pendingFavouriteJobLabel = null;

    /** BE thường gửi kèm regularGrades: [] — vẫn phải ưu tiên academicInfos / academicProfileMetadata */
    if (hasAcademicInfos) {
        pendingAcademicInfos = academicInfosFromApi;
    } else if (hasLegacyGrades || hasLegacyForeign) {
        regularGrades = normalizeRegularGradesFromApi(
            raw.regularGrades ?? raw.regularSubjectGrades ?? raw.schoolReport?.regular,
        );
        const f = normalizeForeignFromApi(
            raw.foreignLanguages ?? raw.foreignLanguageRows ?? raw.schoolReport?.foreignLanguages,
        );
        foreignRows = f.rows;
        foreignGrades = f.grades;
    }

    if (!favoriteMajorCodes.length && favStr && !/^\d+(\.\d+)?$/.test(favStr)) {
        pendingFavouriteJobLabel = favStr;
    }

    return {
        form: {name, gender},
        selectedPersonalityId,
        favoriteMajorCodes,
        regularGrades,
        foreignRows,
        foreignGrades,
        pendingAcademicInfos,
        pendingFavouriteJobLabel,
    };
}

/**
 * Body POST `/parent/student` theo contract BE (`academicInfos`).
 */
export function buildStudentPayload({
    form,
    selectedPersonality,
    selectedPersonalityId,
    favoriteMajorCodes,
    majorGroups,
    regularGrades,
    regularSubjects,
    foreignRows,
    foreignGrades,
    foreignSubjects,
}) {
    const personalityTypeCode =
        selectedPersonality?.code != null && String(selectedPersonality.code).trim() !== ''
            ? String(selectedPersonality.code).trim()
            : selectedPersonalityId
              ? String(selectedPersonalityId).trim()
              : '';

    const favouriteJob = resolveFavouriteJobString(favoriteMajorCodes, majorGroups);

    const academicInfos = GRADE_LEVELS.map(({key, gradeLevelEnum}) => {
        const gradeLevel = gradeLevelEnum;
        const subjectResults = [];
        for (const s of regularSubjects || []) {
            const sid = String(s.id);
            const rawCell = regularGrades[sid]?.[key];
            const score = parseScoreForPayload(rawCell);
            subjectResults.push({
                subjectName: s.name != null ? String(s.name) : sid,
                score,
            });
        }
        for (const fr of foreignRows || []) {
            if (fr.subjectId === '' || fr.subjectId == null) continue;
            const subj = (foreignSubjects || []).find(
                (x) => String(x.id) === String(fr.subjectId),
            );
            const name =
                subj?.name != null ? String(subj.name) : String(fr.subjectId);
            const rawCell = foreignGrades[fr.rowId]?.[key];
            const score = parseScoreForPayload(rawCell);
            subjectResults.push({subjectName: name, score});
        }
        return {gradeLevel, subjectResults};
    });

    return {
        studentName: form.name != null ? String(form.name) : '',
        gender: form.gender != null ? String(form.gender) : '',
        personalityTypeCode,
        favouriteJob,
        academicInfos,
    };
}

export function setStudentState(setters, mapped) {
    setters.setForm(mapped.form);
    setters.setSelectedPersonalityId(mapped.selectedPersonalityId);
    setters.setFavoriteMajorCodes(mapped.favoriteMajorCodes);
    setters.setRegularGrades(mapped.regularGrades);
    setters.setForeignRows(mapped.foreignRows);
    setters.setForeignGrades(mapped.foreignGrades);
    if (setters.setPendingAcademicInfos) {
        setters.setPendingAcademicInfos(mapped.pendingAcademicInfos ?? null);
    }
    if (setters.setPendingFavouriteJobLabel) {
        setters.setPendingFavouriteJobLabel(mapped.pendingFavouriteJobLabel ?? null);
    }
}
