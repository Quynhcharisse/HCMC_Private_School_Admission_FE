import {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {enqueueSnackbar} from 'notistack';
import {
    getParentMajors,
    getParentPersonalityTypes,
    getParentStudent,
    getParentSubjects,
    postParentStudent,
    putParentStudent,
} from '../../../services/ParentService.jsx';
import {
    applyStudentBodyToState,
    buildStudentPayload,
    emptyGrades,
    findPersonalityByCode,
    findPersonalityById,
    getEmptyStudentState,
    mergeAcademicInfosIntoGrades,
    normalizePersonalityGroups,
    normalizeSubjectGroups,
    parseBody,
    setStudentState,
} from './childrenInfoHelpers.js';

export function useChildrenInfoPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({name: '', gender: ''});

    const [personalityGroups, setPersonalityGroups] = useState(null);
    const [personalityLoading, setPersonalityLoading] = useState(true);
    const [selectedPersonalityId, setSelectedPersonalityId] = useState('');

    const personalityListScrollRef = useRef(null);
    const personalityListScrollTopRef = useRef(0);

    const [majorGroups, setMajorGroups] = useState([]);
    const [majorsLoading, setMajorsLoading] = useState(true);
    const [favoriteMajorCodes, setFavoriteMajorCodes] = useState([]);

    const [subjectGroupsLoading, setSubjectGroupsLoading] = useState(true);
    const [subjectGroups, setSubjectGroups] = useState([]);
    const [regularGrades, setRegularGrades] = useState({});
    const [foreignRows, setForeignRows] = useState([
        {rowId: 'foreign-0', subjectId: ''},
    ]);
    const [foreignGrades, setForeignGrades] = useState({});
    const [pendingAcademicInfos, setPendingAcademicInfos] = useState(null);
    const [pendingFavouriteJobLabel, setPendingFavouriteJobLabel] = useState(null);
    const [studentRecords, setStudentRecords] = useState([]);
    const [activeStudentTab, setActiveStudentTab] = useState(0);
    const [creatingNewStudent, setCreatingNewStudent] = useState(false);
    const [currentStudentId, setCurrentStudentId] = useState(null);

    const setters = {
        setForm,
        setSelectedPersonalityId,
        setFavoriteMajorCodes,
        setRegularGrades,
        setForeignRows,
        setForeignGrades,
        setPendingAcademicInfos,
        setPendingFavouriteJobLabel,
        setCurrentStudentId,
    };

    const extractStudentRecords = (body) => {
        if (Array.isArray(body)) return body;
        if (Array.isArray(body?.students)) return body.students;
        if (Array.isArray(body?.data)) return body.data;
        if (body && typeof body === 'object') return [body];
        return [];
    };

    const applyStudentRecordToEditor = (record) => {
        const mapped = applyStudentBodyToState(record);
        setStudentState(setters, mapped);
    };

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const res = await getParentStudent();
                if (cancelled) return;
                if (res?.status === 200) {
                    const body = parseBody(res);
                    const records = extractStudentRecords(body);
                    setStudentRecords(records);
                    if (records.length > 0) {
                        setActiveStudentTab(0);
                        setCreatingNewStudent(false);
                        applyStudentRecordToEditor(records[0]);
                    } else {
                        setActiveStudentTab(0);
                        setCreatingNewStudent(true);
                        setEditMode(true);
                        setStudentState(setters, getEmptyStudentState());
                    }
                } else {
                    setStudentRecords([]);
                    setCreatingNewStudent(true);
                    setStudentState(setters, getEmptyStudentState());
                }
            } catch (e) {
                console.error('ChildrenInfoPage load error:', e);
                if (!cancelled) {
                    enqueueSnackbar('Không thể tải thông tin học sinh.', {variant: 'error'});
                    setStudentRecords([]);
                    setCreatingNewStudent(true);
                    setStudentState(setters, getEmptyStudentState());
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setPersonalityLoading(true);
            try {
                const res = await getParentPersonalityTypes();
                if (cancelled) return;
                if (res?.status === 200) {
                    setPersonalityGroups(normalizePersonalityGroups(parseBody(res)));
                } else {
                    setPersonalityGroups(null);
                }
            } catch (e) {
                console.error('Personality types load error:', e);
                if (!cancelled) {
                    setPersonalityGroups(null);
                    enqueueSnackbar('Không tải được danh sách loại tính cách.', {variant: 'error'});
                }
            } finally {
                if (!cancelled) setPersonalityLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setMajorsLoading(true);
            try {
                const res = await getParentMajors();
                if (cancelled) return;
                if (res?.status === 200) {
                    const body = parseBody(res);
                    setMajorGroups(Array.isArray(body) ? body : []);
                } else {
                    setMajorGroups([]);
                }
            } catch (e) {
                console.error('Parent majors load error:', e);
                if (!cancelled) {
                    setMajorGroups([]);
                    enqueueSnackbar('Không tải được danh sách ngành đào tạo.', {variant: 'error'});
                }
            } finally {
                if (!cancelled) setMajorsLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setSubjectGroupsLoading(true);
            try {
                const res = await getParentSubjects();
                if (cancelled) return;
                if (res?.status === 200) {
                    setSubjectGroups(normalizeSubjectGroups(parseBody(res)));
                } else {
                    setSubjectGroups([]);
                }
            } catch (e) {
                console.error('Parent subjects load error:', e);
                if (!cancelled) {
                    setSubjectGroups([]);
                    enqueueSnackbar('Không tải được danh sách môn học.', {variant: 'error'});
                }
            } finally {
                if (!cancelled) setSubjectGroupsLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const regularSubjectGroup = useMemo(
        () => subjectGroups.find((g) => g?.type === 'regular') ?? null,
        [subjectGroups],
    );
    const foreignSubjectGroup = useMemo(
        () => subjectGroups.find((g) => g?.type === 'foreign_language') ?? null,
        [subjectGroups],
    );
    const regularSubjects = useMemo(() => {
        const list = regularSubjectGroup?.subjects;
        return Array.isArray(list) ? list : [];
    }, [regularSubjectGroup]);
    const foreignSubjects = useMemo(() => {
        const list = foreignSubjectGroup?.subjects;
        return Array.isArray(list) ? list : [];
    }, [foreignSubjectGroup]);

    useEffect(() => {
        if (!regularSubjects.length) return;
        setRegularGrades((prev) => {
            const next = {...prev};
            let changed = false;
            regularSubjects.forEach((s) => {
                const id = String(s.id);
                if (next[id] == null) {
                    next[id] = emptyGrades();
                    changed = true;
                }
            });
            return changed ? next : prev;
        });
    }, [regularSubjects]);

    const selectedPersonality = useMemo(() => {
        if (!personalityGroups || selectedPersonalityId === '') return null;
        const byId = findPersonalityById(personalityGroups, selectedPersonalityId);
        if (byId) return byId;
        return findPersonalityByCode(personalityGroups, selectedPersonalityId);
    }, [personalityGroups, selectedPersonalityId]);

    useEffect(() => {
        if (!personalityGroups || selectedPersonalityId === '') return;
        if (findPersonalityById(personalityGroups, selectedPersonalityId)) return;
        const byCode = findPersonalityByCode(personalityGroups, selectedPersonalityId);
        if (byCode) setSelectedPersonalityId(String(byCode.id));
    }, [personalityGroups, selectedPersonalityId]);

    useEffect(() => {
        if (!pendingAcademicInfos || subjectGroupsLoading) return;
        if (!regularSubjects.length && !foreignSubjects.length) {
            setPendingAcademicInfos(null);
            return;
        }
        const merged = mergeAcademicInfosIntoGrades(
            pendingAcademicInfos,
            regularSubjects,
            foreignSubjects,
        );
        setRegularGrades(merged.regularGrades);
        setForeignRows(merged.foreignRows);
        setForeignGrades(merged.foreignGrades);
        setPendingAcademicInfos(null);
    }, [pendingAcademicInfos, regularSubjects, foreignSubjects, subjectGroupsLoading]);

    useEffect(() => {
        if (!pendingFavouriteJobLabel || !majorGroups.length) return;
        const label = pendingFavouriteJobLabel.trim();
        outer: for (const g of majorGroups) {
            const majors = g?.majors;
            if (!Array.isArray(majors)) continue;
            for (const m of majors) {
                if (String(m.name).trim() === label) {
                    setFavoriteMajorCodes([Number(m.code)]);
                    break outer;
                }
            }
        }
        setPendingFavouriteJobLabel(null);
    }, [pendingFavouriteJobLabel, majorGroups]);

    const handleChange = (e) => {
        const {name, value} = e.target;
        setForm((prev) => ({...prev, [name]: value}));
    };

    const handlePersonalityListScroll = (e) => {
        personalityListScrollTopRef.current = e.currentTarget.scrollTop;
    };

    const handlePersonalityChange = (e) => {
        const el = personalityListScrollRef.current;
        if (el) personalityListScrollTopRef.current = el.scrollTop;
        setSelectedPersonalityId(e.target.value);
    };

    const handleFavoriteMajorChange = (e) => {
        const v = e.target.value;
        setFavoriteMajorCodes(v === '' ? [] : [Number(v)]);
    };

    const handleRegularGradeChange = (subjectId, gradeKey, value) => {
        const id = String(subjectId);
        setRegularGrades((prev) => ({
            ...prev,
            [id]: {...(prev[id] || emptyGrades()), [gradeKey]: value},
        }));
    };

    const handleForeignGradeChange = (rowId, gradeKey, value) => {
        setForeignGrades((prev) => ({
            ...prev,
            [rowId]: {...(prev[rowId] || emptyGrades()), [gradeKey]: value},
        }));
    };

    const handleForeignSubjectChange = (rowId, subjectId) => {
        setForeignRows((prev) =>
            prev.map((r) => (r.rowId === rowId ? {...r, subjectId} : r)),
        );
    };

    const addForeignLanguageRow = () => {
        setForeignRows((prev) => [
            ...prev,
            {
                rowId: `foreign-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                subjectId: '',
            },
        ]);
    };

    const foreignOptionsForRow = (rowId, currentSubjectId) => {
        const taken = new Set(
            foreignRows
                .filter((r) => r.rowId !== rowId && r.subjectId !== '')
                .map((r) => r.subjectId),
        );
        return foreignSubjects.filter(
            (s) => !taken.has(s.id) || s.id === currentSubjectId,
        );
    };

    const fieldsDisabled = !editMode;

    const handleSelectStudentTab = (idx) => {
        if (idx < 0 || idx >= studentRecords.length) return;
        setActiveStudentTab(idx);
        setCreatingNewStudent(false);
        setEditMode(false);
        applyStudentRecordToEditor(studentRecords[idx]);
    };

    const handleAddStudentTab = () => {
        setCreatingNewStudent(true);
        setActiveStudentTab(studentRecords.length);
        setEditMode(true);
        setStudentState(setters, getEmptyStudentState());
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = buildStudentPayload({
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
            });
            const academicBlock = payload.academicInfos;
            if (!Array.isArray(academicBlock) || academicBlock.length === 0) {
                enqueueSnackbar('Thiếu dữ liệu học bạ (academicInfos).', {
                    variant: 'error',
                });
                return;
            }
            const subjectRowCount = academicBlock.reduce((n, ai) => {
                const rows =
                    ai.subjectResults ?? ai.subjectResultList ?? ai.results ?? [];
                return n + rows.length;
            }, 0);
            if (subjectRowCount === 0) {
                enqueueSnackbar(
                    'Chưa có môn học để lưu điểm. Vui lòng đợi danh sách môn tải xong hoặc tải lại trang.',
                    {variant: 'warning'},
                );
                return;
            }
            const usePut =
                !creatingNewStudent &&
                currentStudentId != null &&
                Number.isFinite(Number(currentStudentId));
            const res = usePut
                ? await putParentStudent({
                      ...payload,
                      studentId: Number(currentStudentId),
                  })
                : await postParentStudent(payload);
            if (res && res.status >= 200 && res.status < 300) {
                let reloadOk = false;
                try {
                    const getRes = await getParentStudent();
                    if (getRes?.status === 200) {
                        const body = parseBody(getRes);
                        const records = extractStudentRecords(body);
                        setStudentRecords(records);

                        let nextIndex = activeStudentTab;
                        if (creatingNewStudent) {
                            nextIndex = Math.max(0, records.length - 1);
                        } else if (nextIndex >= records.length) {
                            nextIndex = Math.max(0, records.length - 1);
                        }

                        if (records.length > 0) {
                            setActiveStudentTab(nextIndex);
                            setCreatingNewStudent(false);
                            const mapped = applyStudentBodyToState(records[nextIndex]);
                            setStudentState(setters, mapped);
                            if (
                                mapped.pendingAcademicInfos?.length &&
                                (regularSubjects.length > 0 || foreignSubjects.length > 0)
                            ) {
                                const merged = mergeAcademicInfosIntoGrades(
                                    mapped.pendingAcademicInfos,
                                    regularSubjects,
                                    foreignSubjects,
                                );
                                setRegularGrades(merged.regularGrades);
                                setForeignRows(merged.foreignRows);
                                setForeignGrades(merged.foreignGrades);
                                setPendingAcademicInfos(null);
                            }
                        } else {
                            setActiveStudentTab(0);
                            setCreatingNewStudent(true);
                            setStudentState(setters, getEmptyStudentState());
                        }
                        reloadOk = true;
                    }
                } catch (reloadErr) {
                    console.error('Reload student after save error:', reloadErr);
                }
                if (reloadOk) {
                    enqueueSnackbar('Đã lưu thông tin.', {variant: 'success'});
                } else {
                    enqueueSnackbar(
                        'Đã lưu nhưng không tải lại được dữ liệu mới.',
                        {variant: 'warning'},
                    );
                }
                setEditMode(false);
            } else {
                enqueueSnackbar('Không lưu được dữ liệu.', {variant: 'error'});
            }
        } catch (e) {
            console.error('Save parent student error:', e);
            enqueueSnackbar('Không lưu được dữ liệu.', {variant: 'error'});
        } finally {
            setSaving(false);
        }
    };

    const enterEditMode = () => setEditMode(true);

    useLayoutEffect(() => {
        const el = personalityListScrollRef.current;
        if (!el) return;
        const top = personalityListScrollTopRef.current;
        el.scrollTop = top;
        requestAnimationFrame(() => {
            el.scrollTop = top;
        });
    }, [selectedPersonalityId, personalityLoading, personalityGroups]);

    return {
        navigate,
        loading,
        editMode,
        saving,
        form,
        fieldsDisabled,
        personalityGroups,
        personalityLoading,
        selectedPersonalityId,
        selectedPersonality,
        personalityListScrollRef,
        majorGroups,
        majorsLoading,
        favoriteMajorCodes,
        subjectGroupsLoading,
        regularSubjects,
        foreignSubjects,
        regularGrades,
        foreignRows,
        foreignGrades,
        handleChange,
        handlePersonalityListScroll,
        handlePersonalityChange,
        handleFavoriteMajorChange,
        handleRegularGradeChange,
        handleForeignGradeChange,
        handleForeignSubjectChange,
        addForeignLanguageRow,
        foreignOptionsForRow,
        studentRecords,
        activeStudentTab,
        creatingNewStudent,
        handleSelectStudentTab,
        handleAddStudentTab,
        enterEditMode,
        handleSave,
    };
}
