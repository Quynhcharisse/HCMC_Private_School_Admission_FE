export const genderOptions = [
    {value: 'MALE', label: 'Nam'},
    {value: 'FEMALE', label: 'Nữ'},
    {value: 'OTHER', label: 'Khác'},
];

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

/** Chỉ gửi môn khi có đủ tên môn (không rỗng) và điểm hợp lệ. */
function shouldIncludeSubjectRow(subjectName, score) {
    const name = subjectName != null ? String(subjectName).trim() : '';
    if (!name) return false;
    return score != null && Number.isFinite(score);
}

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

/**
 * Theo BE academicProfileMetadata / subjectResults: chỉ khi `isAvailable === false` mới hiện nhãn "Không khả dụng".
 * Thiếu field hoặc true → coi là khả dụng (không hiện gì).
 */
export function readSubjectResultIsAvailable(sr) {
    if (sr == null || typeof sr !== 'object') return true;
    const v = sr.isAvailable ?? sr.available;
    if (v === false || v === 'false' || v === 0) return false;
    return true;
}

/** Giải thích hiển thị kèm nhãn "Không khả dụng" (metadata / BE tắt isAvailable). */
export const SUBJECT_UNAVAILABLE_TOOLTIP =
    'Môn này không còn nằm trong danh mục môn đang áp dụng trên hệ thống. Điểm đã lưu trong hồ sơ vẫn hiển thị để tham khảo.';

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

    /** Môn trong academicProfileMetadata không khớng danh mục (vd. id null) — giữ đúng tên từ BE. */
    const ensureCustomForeignRow = (displayName) => {
        const n = String(displayName || '').trim();
        if (!n) return null;
        const existing = foreignRows.find((r) => String(r.customSubjectName || '').trim() === n);
        if (existing) return existing.rowId;
        const rowId = `foreign-meta-${foreignRows.length}-${Date.now()}`;
        foreignRows.push({rowId, subjectId: '', customSubjectName: n});
        foreignGrades[rowId] = emptyGrades();
        return rowId;
    };

    if (!Array.isArray(academicInfos)) {
        const regularSubjectAvailable = {};
        (regularSubjects || []).forEach((s) => {
            regularSubjectAvailable[String(s.id)] = true;
        });
        const foreignRowAvailable = {};
        foreignRows.forEach((r) => {
            foreignRowAvailable[r.rowId] = true;
        });
        return {
            regularGrades,
            foreignRows,
            foreignGrades,
            regularSubjectAvailable,
            foreignRowAvailable,
        };
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
                continue;
            }
            const customRowId = ensureCustomForeignRow(name);
            if (customRowId) {
                foreignGrades[customRowId][key] = scoreStr;
            }
        }
    }

    const regularSubjectAvailable = {};
    (regularSubjects || []).forEach((s) => {
        regularSubjectAvailable[String(s.id)] = true;
    });
    const foreignRowAvailable = {};
    foreignRows.forEach((r) => {
        foreignRowAvailable[r.rowId] = true;
    });

    for (const ai of academicInfos) {
        const key = gradeLevelApiToKey(ai.gradeLevel);
        if (!key) continue;
        const rows = ai.subjectResults ?? ai.subjectResultList ?? ai.results ?? [];
        for (const sr of rows) {
            const nameRaw = sr?.subjectName ?? sr?.name ?? sr?.subject;
            if (!sr || nameRaw == null || String(nameRaw).trim() === '') continue;
            const name = String(nameRaw).trim();
            const av = readSubjectResultIsAvailable(sr);

            const reg = (regularSubjects || []).find(
                (x) => String(x.name).trim() === name,
            );
            if (reg) {
                const id = String(reg.id);
                regularSubjectAvailable[id] = regularSubjectAvailable[id] && av;
                continue;
            }
            const forSub = (foreignSubjects || []).find(
                (x) => String(x.name).trim() === name,
            );
            if (forSub) {
                const existing = foreignRows.find(
                    (r) =>
                        r.subjectId !== '' &&
                        (Number(r.subjectId) === Number(forSub.id) ||
                            String(r.subjectId) === String(forSub.id)),
                );
                if (existing) {
                    foreignRowAvailable[existing.rowId] =
                        foreignRowAvailable[existing.rowId] && av;
                }
                continue;
            }
            const existingCustom = foreignRows.find(
                (r) => String(r.customSubjectName || '').trim() === name,
            );
            if (existingCustom) {
                foreignRowAvailable[existingCustom.rowId] =
                    foreignRowAvailable[existingCustom.rowId] && av;
            }
        }
    }

    return {
        regularGrades,
        foreignRows,
        foreignGrades,
        regularSubjectAvailable,
        foreignRowAvailable,
    };
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
        regularSubjectAvailable: {},
        foreignRowAvailable: {},
        pendingAcademicInfos: null,
        pendingFavouriteJobLabel: null,
        studentId: null,
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

    const idRaw = raw.studentId ?? raw.id;
    let studentId = null;
    if (idRaw != null && String(idRaw).trim() !== '') {
        const n = Number(idRaw);
        studentId = Number.isFinite(n) ? n : null;
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
        studentId,
    };
}

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
    transcriptImages,
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
            const subjectName = s.name != null ? String(s.name).trim() : '';
            if (!shouldIncludeSubjectRow(subjectName, score)) continue;
            subjectResults.push({subjectName, score});
        }
        for (const fr of foreignRows || []) {
            const customName =
                fr.customSubjectName != null ? String(fr.customSubjectName).trim() : '';
            if (customName) {
                const rawCell = foreignGrades[fr.rowId]?.[key];
                const score = parseScoreForPayload(rawCell);
                if (!shouldIncludeSubjectRow(customName, score)) continue;
                subjectResults.push({subjectName: customName, score});
                continue;
            }
            if (fr.subjectId === '' || fr.subjectId == null) continue;
            const subj = (foreignSubjects || []).find(
                (x) => String(x.id) === String(fr.subjectId),
            );
            const subjectName = (
                subj?.name != null ? String(subj.name) : String(fr.subjectId)
            ).trim();
            const rawCell = foreignGrades[fr.rowId]?.[key];
            const score = parseScoreForPayload(rawCell);
            if (!shouldIncludeSubjectRow(subjectName, score)) continue;
            subjectResults.push({subjectName, score});
        }
        return {gradeLevel, subjectResults};
    }).filter((block) => (block.subjectResults || []).length > 0);

    const payload = {
        studentName: form.name != null ? String(form.name) : '',
        gender: form.gender != null ? String(form.gender) : '',
        personalityTypeCode,
        favouriteJob,
        academicInfos,
    };
    if (Array.isArray(transcriptImages)) {
        payload.transcriptImages = transcriptImages;
    }
    return payload;
}

export function setStudentState(setters, mapped) {
    setters.setForm(mapped.form);
    setters.setSelectedPersonalityId(mapped.selectedPersonalityId);
    setters.setFavoriteMajorCodes(mapped.favoriteMajorCodes);
    setters.setRegularGrades(mapped.regularGrades);
    setters.setForeignRows(mapped.foreignRows);
    setters.setForeignGrades(mapped.foreignGrades);
    if (setters.setRegularSubjectAvailable) {
        setters.setRegularSubjectAvailable(mapped.regularSubjectAvailable ?? {});
    }
    if (setters.setForeignRowAvailable) {
        setters.setForeignRowAvailable(mapped.foreignRowAvailable ?? {});
    }
    if (setters.setPendingAcademicInfos) {
        setters.setPendingAcademicInfos(mapped.pendingAcademicInfos ?? null);
    }
    if (setters.setPendingFavouriteJobLabel) {
        setters.setPendingFavouriteJobLabel(mapped.pendingFavouriteJobLabel ?? null);
    }
    if (setters.setCurrentStudentId) {
        const sid = mapped.studentId;
        setters.setCurrentStudentId(
            sid != null && Number.isFinite(Number(sid)) ? Number(sid) : null,
        );
    }
}
