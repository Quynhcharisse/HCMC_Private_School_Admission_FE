import React from "react";
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";
import {
    AssignmentTurnedIn as AssignmentTurnedInIcon,
    CheckCircle as CheckCircleIcon,
    Close as CloseIcon,
    CloudUpload as CloudUploadIcon,
    DeleteOutline as DeleteOutlineIcon,
    InsertPhoto as InsertPhotoIcon,
    PersonOutline as PersonOutlineIcon,
} from "@mui/icons-material";
import {
    getParentAdmissionDocuments,
    getParentStudent,
    pickAdmissionDocumentsFromResponse,
    postParentAdmissionReservationForm,
} from "../../../services/ParentService.jsx";
import {getProfile} from "../../../services/AccountService.jsx";
import {showErrorSnackbar, showSuccessSnackbar, showWarningSnackbar} from "../../ui/AppSnackbar.jsx";
import {isCloudinaryConfigured, uploadFileToCloudinary} from "../../../utils/cloudinaryUpload.js";

const HOC_BA_THCS_CODE = "HOC_BA";
const HOC_BA_THCS_GRADE_LABELS = ["Lớp 6", "Lớp 7", "Lớp 8", "Lớp 9"];

const ACCEPT_IMAGE_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/x-png", "image/webp"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function isAllowedImage(file) {
    const type = (file?.type || "").toLowerCase();
    if (ACCEPT_IMAGE_MIME.has(type)) return true;
    const name = (file?.name || "").toLowerCase();
    return /\.(jpe?g|png|webp)$/i.test(name);
}

function formatBytes(n) {
    if (!Number.isFinite(n)) return "";
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function extractStudentRecords(response) {
    const data = response?.data;
    if (data == null) return [];
    let inner = data.body ?? data;
    if (typeof inner === "string") {
        try {
            inner = JSON.parse(inner);
        } catch {
            return [];
        }
    }
    if (Array.isArray(inner)) return inner;
    if (Array.isArray(inner?.students)) return inner.students;
    if (Array.isArray(inner?.data)) return inner.data;
    if (inner && typeof inner === "object") return [inner];
    return [];
}

function pickStudentName(student) {
    if (!student || typeof student !== "object") return "";
    return (
        student.studentName ||
        student.childName ||
        student.fullName ||
        student.name ||
        ""
    );
}

function pickStudentId(student) {
    if (!student || typeof student !== "object") return null;
    const raw = student.studentProfileId ?? student.id ?? student.studentId ?? null;
    if (raw == null) return null;
    const num = Number(raw);
    return Number.isFinite(num) && num > 0 ? num : null;
}

const GENDER_LABELS = {
    MALE: "Nam",
    FEMALE: "Nữ",
    OTHER: "Khác",
    M: "Nam",
    F: "Nữ",
};

function pickStudentGenderLabel(student) {
    const raw = student?.gender;
    if (raw == null) return "";
    const key = String(raw).trim().toUpperCase();
    return GENDER_LABELS[key] || (typeof raw === "string" ? raw : "");
}

function pickStudentBirthYear(student) {
    const raw = student?.dateOfBirth || student?.dob || student?.birthday;
    if (!raw) return "";
    const m = String(raw).match(/(\d{4})/);
    return m ? m[1] : "";
}

function pickStudentSubLabel(student) {
    const parts = [];
    const gender = pickStudentGenderLabel(student);
    if (gender) parts.push(gender);
    const birthYear = pickStudentBirthYear(student);
    if (birthYear) parts.push(`Sinh năm ${birthYear}`);
    return parts.join(" • ");
}

function pickParentInfoFromProfileResponse(response) {
    const rawBody = response?.data?.body ?? response?.body ?? null;
    let body = rawBody;
    if (typeof body === "string") {
        try {
            body = JSON.parse(body);
        } catch {
            body = null;
        }
    }
    const parent = body?.parent || {};
    const name = String(parent?.name || body?.name || body?.fullName || "").trim();
    const phone = String(
        parent?.phone || body?.phone || body?.phoneNumber || body?.mobile || body?.phoneNo || ""
    ).trim();
    const email = String(parent?.email || body?.email || "").trim();
    return {name, phone, email};
}

function buildEmptySlots(count) {
    return Array.from({length: count}, () => null);
}

function buildInitialDocsState(required, optional) {
    const list = [];
    for (const item of required || []) {
        if (!item || !item.code) continue;
        const slotCount = item.code === HOC_BA_THCS_CODE ? HOC_BA_THCS_GRADE_LABELS.length : 1;
        list.push({
            code: String(item.code),
            name: String(item.name || item.code || ""),
            required: true,
            slots: buildEmptySlots(slotCount),
        });
    }
    for (const item of optional || []) {
        if (!item || !item.code) continue;
        const slotCount = item.code === HOC_BA_THCS_CODE ? HOC_BA_THCS_GRADE_LABELS.length : 1;
        list.push({
            code: String(item.code),
            name: String(item.name || item.code || ""),
            required: false,
            slots: buildEmptySlots(slotCount),
        });
    }
    return list;
}

function pickOfferingProgramName(offering) {
    if (!offering || typeof offering !== "object") return "";
    return (
        offering?.program?.name ||
        offering?.curriculum?.name ||
        offering?.programName ||
        offering?.name ||
        ""
    );
}

const SECTION_LABEL_SX = {
    fontSize: "0.78rem",
    fontWeight: 800,
    color: "#1e3a8a",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    mb: 0.8,
};

export default function AdmissionReservationDialog({
    open,
    onClose,
    offering,
    campaign,
    school,
    onSubmitted,
}) {
    const offeringId = React.useMemo(() => {
        const raw = offering?.id;
        if (raw == null) return null;
        const num = Number(raw);
        return Number.isFinite(num) && num > 0 ? num : null;
    }, [offering?.id]);

    const [docsLoading, setDocsLoading] = React.useState(false);
    const [docsError, setDocsError] = React.useState("");
    const [docs, setDocs] = React.useState([]);

    const [studentLoading, setStudentLoading] = React.useState(false);
    const [studentError, setStudentError] = React.useState("");
    const [students, setStudents] = React.useState([]);
    const [selectedStudentId, setSelectedStudentId] = React.useState(null);

    const [parentInfo, setParentInfo] = React.useState({
        name: "",
        phone: "",
        email: "",
    });

    const [uploadingSlots, setUploadingSlots] = React.useState(() => new Set());
    const [submitting, setSubmitting] = React.useState(false);

    const cloudinaryReady = isCloudinaryConfigured();

    const resetState = React.useCallback(() => {
        setDocs([]);
        setDocsError("");
        setStudentError("");
        setUploadingSlots(new Set());
        setSubmitting(false);
    }, []);

    React.useEffect(() => {
        if (!open) {
            resetState();
            return undefined;
        }
        if (offeringId == null) {
            setDocs([]);
            setDocsError("Không xác định được gói tuyển sinh để tải danh sách hồ sơ.");
            return undefined;
        }
        let cancelled = false;
        setDocsLoading(true);
        setDocsError("");
        (async () => {
            try {
                const res = await getParentAdmissionDocuments(offeringId);
                if (cancelled) return;
                const {required, optional} = pickAdmissionDocumentsFromResponse(res);
                const initial = buildInitialDocsState(required, optional);
                setDocs(initial);
                if (initial.length === 0) {
                    setDocsError("Nhà trường chưa cấu hình danh sách hồ sơ cần nộp cho gói này.");
                }
            } catch (err) {
                if (cancelled) return;
                console.error("[AdmissionReservationDialog] load docs error:", err);
                setDocs([]);
                setDocsError(err?.response?.data?.message || err?.message || "Không tải được danh sách hồ sơ.");
            } finally {
                if (!cancelled) setDocsLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [open, offeringId, resetState]);

    React.useEffect(() => {
        if (!open) return undefined;
        let cancelled = false;
        setStudentLoading(true);
        setStudentError("");
        (async () => {
            try {
                const res = await getParentStudent();
                if (cancelled) return;
                const list = extractStudentRecords(res)
                    .map((s) => ({
                        id: pickStudentId(s),
                        name: pickStudentName(s) || "Học sinh",
                        subLabel: pickStudentSubLabel(s),
                        raw: s,
                    }))
                    .filter((s) => s.id != null);
                setStudents(list);
                if (list.length === 0) {
                    setStudentError("Bạn chưa có hồ sơ học sinh nào. Vui lòng thêm hồ sơ trước khi nộp đơn.");
                    setSelectedStudentId(null);
                } else {
                    setSelectedStudentId((prev) => {
                        if (prev != null && list.some((s) => s.id === prev)) return prev;
                        return list[0].id;
                    });
                }
            } catch (err) {
                if (cancelled) return;
                console.error("[AdmissionReservationDialog] load students error:", err);
                setStudents([]);
                setSelectedStudentId(null);
                setStudentError(err?.response?.data?.message || err?.message || "Không tải được danh sách hồ sơ học sinh.");
            } finally {
                if (!cancelled) setStudentLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [open]);

    React.useEffect(() => {
        if (!open) return undefined;
        let cancelled = false;
        (async () => {
            try {
                const res = await getProfile();
                if (cancelled) return;
                setParentInfo(pickParentInfoFromProfileResponse(res));
            } catch (err) {
                if (cancelled) return;
                console.warn("[AdmissionReservationDialog] load parent profile failed:", err);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [open]);

    const setSlotUploading = React.useCallback((slotKey, isUploading) => {
        setUploadingSlots((prev) => {
            const next = new Set(prev);
            if (isUploading) next.add(slotKey);
            else next.delete(slotKey);
            return next;
        });
    }, []);

    const handlePickFile = React.useCallback(
        async (docIndex, slotIndex, file) => {
            if (!file) return;
            if (!cloudinaryReady) {
                showErrorSnackbar("Chưa cấu hình Cloudinary, không thể tải ảnh lên.");
                return;
            }
            if (!isAllowedImage(file)) {
                showWarningSnackbar("Chỉ hỗ trợ định dạng ảnh JPG, JPEG, PNG, WEBP.");
                return;
            }
            if (file.size > MAX_IMAGE_BYTES) {
                showWarningSnackbar(`Ảnh vượt quá ${formatBytes(MAX_IMAGE_BYTES)}, vui lòng chọn ảnh nhỏ hơn.`);
                return;
            }
            const slotKey = `${docIndex}-${slotIndex}`;
            setSlotUploading(slotKey, true);
            try {
                const result = await uploadFileToCloudinary(file);
                setDocs((prev) => {
                    const next = prev.slice();
                    const target = next[docIndex];
                    if (!target) return prev;
                    const slots = target.slots.slice();
                    slots[slotIndex] = result.url;
                    next[docIndex] = {...target, slots};
                    return next;
                });
            } catch (err) {
                console.error("[AdmissionReservationDialog] upload error:", err);
                showErrorSnackbar(err?.message || "Tải ảnh lên thất bại, vui lòng thử lại.");
            } finally {
                setSlotUploading(slotKey, false);
            }
        },
        [cloudinaryReady, setSlotUploading]
    );

    const handleRemoveSlot = React.useCallback((docIndex, slotIndex) => {
        setDocs((prev) => {
            const next = prev.slice();
            const target = next[docIndex];
            if (!target) return prev;
            const slots = target.slots.slice();
            slots[slotIndex] = null;
            next[docIndex] = {...target, slots};
            return next;
        });
    }, []);

    const anyUploading = uploadingSlots.size > 0;

    const validation = React.useMemo(() => {
        if (offeringId == null) return {ok: false, message: "Thiếu mã gói tuyển sinh."};
        if (!Number.isFinite(Number(selectedStudentId)) || Number(selectedStudentId) <= 0) {
            return {ok: false, message: "Vui lòng chọn hồ sơ học sinh."};
        }
        for (const doc of docs) {
            if (!doc.required) continue;
            const filledAll = doc.slots.every((u) => typeof u === "string" && u.trim() !== "");
            if (!filledAll) {
                if (doc.code === HOC_BA_THCS_CODE) {
                    return {ok: false, message: `Vui lòng tải đủ ${HOC_BA_THCS_GRADE_LABELS.length} ảnh học bạ THCS (4 năm cấp 2).`};
                }
                return {ok: false, message: `Vui lòng tải ảnh hồ sơ "${doc.name}".`};
            }
        }
        return {ok: true, message: ""};
    }, [docs, offeringId, selectedStudentId]);

    const handleSubmit = React.useCallback(async () => {
        if (!validation.ok) {
            if (validation.message) showWarningSnackbar(validation.message);
            return;
        }
        if (anyUploading) {
            showWarningSnackbar("Vui lòng đợi quá trình tải ảnh hoàn tất.");
            return;
        }
        const submissionDocuments = docs
            .map((doc) => {
                const imageUrl = doc.slots.filter((u) => typeof u === "string" && u.trim() !== "");
                if (imageUrl.length === 0) return null;
                return {key: doc.code, imageUrl};
            })
            .filter(Boolean);

        if (submissionDocuments.length === 0) {
            showWarningSnackbar("Vui lòng tải lên ít nhất 1 hồ sơ trước khi nộp.");
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                submissionDocuments,
                campusProgramOfferingId: Number(offeringId),
                studentProfileId: Number(selectedStudentId),
            };
            await postParentAdmissionReservationForm(payload);
            showSuccessSnackbar("Nộp đơn xin giữ chỗ thành công.");
            if (typeof onSubmitted === "function") onSubmitted();
            if (typeof onClose === "function") onClose();
        } catch (err) {
            console.error("[AdmissionReservationDialog] submit error:", err);
            const msg = err?.response?.data?.message || err?.message || "Nộp đơn thất bại, vui lòng thử lại.";
            showErrorSnackbar(msg);
        } finally {
            setSubmitting(false);
        }
    }, [anyUploading, docs, offeringId, onClose, onSubmitted, selectedStudentId, validation]);

    const handleClose = React.useCallback(() => {
        if (submitting || anyUploading) return;
        if (typeof onClose === "function") onClose();
    }, [anyUploading, onClose, submitting]);

    const programName = pickOfferingProgramName(offering) || "—";
    const campaignName = String(campaign?.name || "").trim() || "—";
    const schoolName = String(school?.name || "").trim() || "—";

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            fullWidth
            maxWidth="md"
            PaperProps={{
                sx: {
                    borderRadius: 2,
                    border: "1px solid rgba(147,197,253,0.45)",
                    boxShadow: "0 18px 40px rgba(15,23,42,0.18)",
                    overflow: "hidden",
                },
            }}
        >
            <DialogTitle
                sx={{
                    fontWeight: 800,
                    fontSize: "1.1rem",
                    color: "#1e3a8a",
                    pb: 1.2,
                    pr: 5,
                    bgcolor: "rgba(59,130,246,0.06)",
                    position: "relative",
                    borderBottom: "1px solid rgba(147,197,253,0.4)",
                }}
            >
                <Stack direction="row" alignItems="center" spacing={1}>
                    <AssignmentTurnedInIcon sx={{color: "#1e3a8a", fontSize: 22}} />
                    <Typography sx={{fontSize: "1.08rem", fontWeight: 800, color: "#1e3a8a"}}>
                        Đơn xin giữ chỗ
                    </Typography>
                </Stack>
                <IconButton
                    aria-label="Đóng"
                    onClick={handleClose}
                    disabled={submitting || anyUploading}
                    sx={{position: "absolute", top: 8, right: 8, color: "#475569"}}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{pt: "20px !important", pb: 2, bgcolor: "#ffffff"}}>
                <Stack spacing={2.5}>
                    <Divider sx={{borderColor: "rgba(148,163,184,0.25)"}} />

                    <Box>
                        <Typography sx={SECTION_LABEL_SX}>Phụ huynh</Typography>
                        <Stack spacing={0.5}>
                            <InfoRow label="Họ và tên" value={parentInfo.name || "—"} />
                            <InfoRow label="Số điện thoại" value={parentInfo.phone || "—"} />
                            {parentInfo.email ? (
                                <InfoRow label="Email" value={parentInfo.email} />
                            ) : null}
                        </Stack>
                    </Box>

                    <Divider sx={{borderColor: "rgba(148,163,184,0.25)"}} />

                    <Box>
                        <Typography sx={SECTION_LABEL_SX}>
                            Học sinh nộp đơn
                            {students.length > 1 ? ` (chọn 1 trong ${students.length})` : ""}
                        </Typography>
                        {studentLoading ? (
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <CircularProgress size={16} />
                                <Typography sx={{fontSize: "0.92rem", color: "#475569"}}>
                                    Đang tải hồ sơ học sinh...
                                </Typography>
                            </Stack>
                        ) : students.length === 0 ? (
                            <Typography sx={{fontSize: "0.92rem", color: "#b45309"}}>
                                {studentError || "Bạn chưa có hồ sơ học sinh nào."}
                            </Typography>
                        ) : (
                            <Box
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns: {
                                        xs: "1fr",
                                        sm: students.length > 1 ? "repeat(2, minmax(0, 1fr))" : "1fr",
                                    },
                                    gap: 1,
                                }}
                            >
                                {students.map((s) => {
                                    const selected = selectedStudentId === s.id;
                                    const onlyOne = students.length === 1;
                                    return (
                                        <Box
                                            key={s.id}
                                            role={onlyOne ? undefined : "button"}
                                            tabIndex={onlyOne || submitting ? -1 : 0}
                                            onClick={() => {
                                                if (onlyOne || submitting) return;
                                                setSelectedStudentId(s.id);
                                            }}
                                            onKeyDown={(e) => {
                                                if (onlyOne || submitting) return;
                                                if (e.key === "Enter" || e.key === " ") {
                                                    e.preventDefault();
                                                    setSelectedStudentId(s.id);
                                                }
                                            }}
                                            sx={{
                                                p: 1.1,
                                                borderRadius: 1.5,
                                                bgcolor: selected ? "rgba(219,234,254,0.55)" : "#fff",
                                                border: "1.5px solid",
                                                borderColor: selected ? "#1d4ed8" : "rgba(148,163,184,0.45)",
                                                cursor: onlyOne || submitting ? "default" : "pointer",
                                                transition: "border-color 0.18s ease, background-color 0.18s ease",
                                                "&:hover":
                                                    onlyOne || submitting
                                                        ? {}
                                                        : {
                                                              borderColor: selected ? "#1e3a8a" : "rgba(59,130,246,0.6)",
                                                              bgcolor: "rgba(219,234,254,0.4)",
                                                          },
                                            }}
                                        >
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <Box
                                                    sx={{
                                                        width: 32,
                                                        height: 32,
                                                        borderRadius: "50%",
                                                        bgcolor: selected ? "rgba(59,130,246,0.18)" : "#f1f5f9",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    <PersonOutlineIcon
                                                        sx={{
                                                            fontSize: 20,
                                                            color: selected ? "#1e3a8a" : "#64748b",
                                                        }}
                                                    />
                                                </Box>
                                                <Box sx={{minWidth: 0, flex: 1}}>
                                                    <Typography
                                                        sx={{
                                                            fontSize: "0.96rem",
                                                            fontWeight: 700,
                                                            color: "#0f172a",
                                                            lineHeight: 1.3,
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            whiteSpace: "nowrap",
                                                        }}
                                                    >
                                                        {s.name}
                                                    </Typography>
                                                    {s.subLabel ? (
                                                        <Typography
                                                            sx={{
                                                                fontSize: "0.78rem",
                                                                color: "#64748b",
                                                                mt: 0.1,
                                                            }}
                                                        >
                                                            {s.subLabel}
                                                        </Typography>
                                                    ) : null}
                                                </Box>
                                                {!onlyOne ? (
                                                    selected ? (
                                                        <CheckCircleIcon sx={{fontSize: 20, color: "#1d4ed8"}} />
                                                    ) : (
                                                        <Box
                                                            sx={{
                                                                width: 16,
                                                                height: 16,
                                                                borderRadius: "50%",
                                                                border: "2px solid rgba(148,163,184,0.6)",
                                                            }}
                                                        />
                                                    )
                                                ) : null}
                                            </Stack>
                                        </Box>
                                    );
                                })}
                            </Box>
                        )}
                    </Box>

                    <Divider sx={{borderColor: "rgba(148,163,184,0.25)"}} />

                    <Box>
                        <Typography sx={SECTION_LABEL_SX}>Hồ sơ cần nộp</Typography>

                        {!cloudinaryReady ? (
                            <Box
                                sx={{
                                    p: 1.25,
                                    mb: 1.25,
                                    borderRadius: 1.5,
                                    bgcolor: "rgba(254,242,242,0.95)",
                                    border: "1px solid rgba(248,113,113,0.45)",
                                }}
                            >
                                <Typography sx={{fontSize: "0.86rem", color: "#b91c1c", fontWeight: 600}}>
                                    Chưa cấu hình Cloudinary (VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET).
                                    Bạn sẽ không thể tải ảnh hồ sơ lên.
                                </Typography>
                            </Box>
                        ) : null}

                        {docsLoading ? (
                            <Stack direction="row" alignItems="center" spacing={1.2} sx={{py: 1.5}}>
                                <CircularProgress size={20} />
                                <Typography sx={{fontSize: "0.95rem", color: "#475569"}}>
                                    Đang tải danh sách hồ sơ...
                                </Typography>
                            </Stack>
                        ) : docsError ? (
                            <Typography sx={{fontSize: "0.95rem", color: "#b45309"}}>
                                {docsError}
                            </Typography>
                        ) : docs.length === 0 ? (
                            <Typography sx={{fontSize: "0.95rem", color: "#475569"}}>
                                Không có hồ sơ nào cần nộp cho gói này.
                            </Typography>
                        ) : (
                            <Stack spacing={1.5}>
                                {docs.map((doc, docIndex) => (
                                    <DocumentItem
                                        key={`${doc.code}-${docIndex}`}
                                        ordinal={docIndex + 1}
                                        doc={doc}
                                        docIndex={docIndex}
                                        uploadingSlots={uploadingSlots}
                                        disabled={submitting}
                                        onPickFile={handlePickFile}
                                        onRemoveSlot={handleRemoveSlot}
                                    />
                                ))}
                            </Stack>
                        )}
                    </Box>
                </Stack>
            </DialogContent>

            <DialogActions
                sx={{
                    px: 2.5,
                    py: 1.5,
                    borderTop: "1px solid rgba(148,163,184,0.22)",
                    bgcolor: "#fff",
                    gap: 1,
                }}
            >
                <Button
                    onClick={handleClose}
                    disabled={submitting || anyUploading}
                    sx={{textTransform: "none", fontWeight: 700, px: 2, color: "#475569"}}
                >
                    Hủy
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={submitting || anyUploading || docsLoading || !validation.ok}
                    variant="contained"
                    sx={{
                        textTransform: "none",
                        fontWeight: 800,
                        borderRadius: 2,
                        px: 2.5,
                        bgcolor: "#2563eb",
                        boxShadow: "0 4px 12px rgba(37,99,235,0.22)",
                        "&:hover": {
                            bgcolor: "#1d4ed8",
                            boxShadow: "0 6px 16px rgba(37,99,235,0.3)",
                        },
                        "&.Mui-disabled": {
                            bgcolor: "rgba(59,130,246,0.45)",
                            color: "rgba(255,255,255,0.85)",
                        },
                    }}
                >
                    {submitting ? "Đang nộp..." : "Nộp đơn"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

function InfoRow({label, value}) {
    return (
        <Stack direction="row" spacing={1.5} alignItems="baseline" sx={{lineHeight: 1.65}}>
            <Typography
                sx={{
                    fontSize: "0.92rem",
                    fontWeight: 600,
                    color: "#475569",
                    minWidth: 130,
                    flexShrink: 0,
                }}
            >
                {label}:
            </Typography>
            <Typography sx={{fontSize: "0.96rem", color: "#0f172a", fontWeight: 600}}>
                {value || "—"}
            </Typography>
        </Stack>
    );
}

function DocumentItem({ordinal, doc, docIndex, uploadingSlots, disabled, onPickFile, onRemoveSlot}) {
    const slotCount = doc.slots.length;
    const isMultiSlot = slotCount > 1;

    return (
        <Box>
            <Typography
                sx={{
                    fontSize: "0.96rem",
                    color: "#0f172a",
                    lineHeight: 1.55,
                    mb: 0.6,
                }}
            >
                <Box component="span" sx={{fontWeight: 800, mr: 0.5}}>{ordinal}.</Box>
                {doc.name}
                {doc.required ? (
                    <Box
                        component="span"
                        sx={{
                            ml: 0.6,
                            color: "#b91c1c",
                            fontSize: "0.84rem",
                            fontWeight: 600,
                        }}
                    >
                        (bắt buộc)
                    </Box>
                ) : (
                    <Box
                        component="span"
                        sx={{
                            ml: 0.6,
                            color: "#64748b",
                            fontSize: "0.84rem",
                            fontWeight: 500,
                        }}
                    >
                        (tùy chọn)
                    </Box>
                )}
                {isMultiSlot ? (
                    <Box
                        component="span"
                        sx={{
                            ml: 0.6,
                            color: "#64748b",
                            fontSize: "0.86rem",
                        }}
                    >
                        — {slotCount} ảnh (Lớp 6 → Lớp 9)
                    </Box>
                ) : null}
            </Typography>

            <Box
                sx={{
                    pl: {xs: 0, sm: 2.2},
                    display: "grid",
                    gridTemplateColumns: isMultiSlot
                        ? {xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(4, minmax(0, 1fr))"}
                        : {xs: "1fr", sm: "minmax(0, 180px)"},
                    gap: 1,
                }}
            >
                {doc.slots.map((url, slotIndex) => {
                    const slotKey = `${docIndex}-${slotIndex}`;
                    const isUploading = uploadingSlots.has(slotKey);
                    const slotLabel = isMultiSlot
                        ? HOC_BA_THCS_GRADE_LABELS[slotIndex] || `Ảnh ${slotIndex + 1}`
                        : "Ảnh hồ sơ";
                    return (
                        <UploadSlot
                            key={slotKey}
                            label={slotLabel}
                            url={url}
                            uploading={isUploading}
                            disabled={disabled}
                            onPick={(file) => onPickFile(docIndex, slotIndex, file)}
                            onRemove={() => onRemoveSlot(docIndex, slotIndex)}
                        />
                    );
                })}
            </Box>
        </Box>
    );
}

function UploadSlot({label, url, uploading, disabled, onPick, onRemove}) {
    const inputRef = React.useRef(null);
    const handleClickPicker = () => {
        if (disabled || uploading) return;
        inputRef.current?.click();
    };
    const handleChange = (e) => {
        const file = e.target.files?.[0] || null;
        e.target.value = "";
        if (file) onPick(file);
    };
    const hasUrl = typeof url === "string" && url.trim() !== "";

    return (
        <Box>
            <Typography sx={{fontSize: "0.74rem", fontWeight: 600, color: "#64748b", mb: 0.4}}>
                {label}
            </Typography>
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleChange}
                disabled={disabled || uploading}
            />
            {hasUrl ? (
                <Box
                    sx={{
                        position: "relative",
                        borderRadius: 1.5,
                        overflow: "hidden",
                        border: "1px solid rgba(34,197,94,0.45)",
                        bgcolor: "#f0fdf4",
                        aspectRatio: "1",
                    }}
                >
                    <Box
                        component="img"
                        src={url}
                        alt={label}
                        sx={{width: "100%", height: "100%", objectFit: "cover", display: "block"}}
                    />
                    {uploading ? (
                        <Box
                            sx={{
                                position: "absolute",
                                inset: 0,
                                bgcolor: "rgba(15,23,42,0.55)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <CircularProgress size={26} sx={{color: "#fff"}} />
                        </Box>
                    ) : (
                        <Stack
                            direction="row"
                            spacing={0.5}
                            sx={{position: "absolute", top: 6, right: 6}}
                        >
                            <Tooltip title="Thay ảnh">
                                <span>
                                    <IconButton
                                        size="small"
                                        onClick={handleClickPicker}
                                        disabled={disabled}
                                        sx={{
                                            bgcolor: "rgba(255,255,255,0.92)",
                                            color: "#1e3a8a",
                                            border: "1px solid rgba(148,163,184,0.4)",
                                            "&:hover": {bgcolor: "#fff"},
                                            width: 28,
                                            height: 28,
                                        }}
                                    >
                                        <CloudUploadIcon sx={{fontSize: 16}} />
                                    </IconButton>
                                </span>
                            </Tooltip>
                            <Tooltip title="Xóa ảnh">
                                <span>
                                    <IconButton
                                        size="small"
                                        onClick={onRemove}
                                        disabled={disabled}
                                        sx={{
                                            bgcolor: "rgba(254,242,242,0.95)",
                                            color: "#b91c1c",
                                            border: "1px solid rgba(248,113,113,0.4)",
                                            "&:hover": {bgcolor: "#fee2e2"},
                                            width: 28,
                                            height: 28,
                                        }}
                                    >
                                        <DeleteOutlineIcon sx={{fontSize: 16}} />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </Stack>
                    )}
                </Box>
            ) : (
                <Box
                    role="button"
                    tabIndex={disabled || uploading ? -1 : 0}
                    onClick={handleClickPicker}
                    onKeyDown={(e) => {
                        if (disabled || uploading) return;
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleClickPicker();
                        }
                    }}
                    sx={{
                        aspectRatio: "1",
                        borderRadius: 1.5,
                        border: "2px dashed rgba(59,130,246,0.4)",
                        bgcolor: uploading ? "rgba(219,234,254,0.4)" : "#f8fafc",
                        cursor: disabled || uploading ? "not-allowed" : "pointer",
                        opacity: disabled ? 0.65 : 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 0.4,
                        transition: "border-color 0.2s ease, background-color 0.2s ease",
                        "&:hover":
                            disabled || uploading
                                ? {}
                                : {
                                      borderColor: "rgba(59,130,246,0.7)",
                                      bgcolor: "rgba(219,234,254,0.45)",
                                  },
                    }}
                >
                    {uploading ? (
                        <>
                            <CircularProgress size={22} />
                            <Typography sx={{fontSize: "0.74rem", color: "#1e3a8a", fontWeight: 700}}>
                                Đang tải...
                            </Typography>
                        </>
                    ) : (
                        <>
                            <InsertPhotoIcon sx={{fontSize: 26, color: "#3b82f6"}} />
                            <Typography sx={{fontSize: "0.78rem", color: "#1e3a8a", fontWeight: 700}}>
                                Tải ảnh lên
                            </Typography>
                            <Typography sx={{fontSize: "0.7rem", color: "#94a3b8"}}>
                                JPG / PNG / WEBP
                            </Typography>
                        </>
                    )}
                </Box>
            )}
        </Box>
    );
}
