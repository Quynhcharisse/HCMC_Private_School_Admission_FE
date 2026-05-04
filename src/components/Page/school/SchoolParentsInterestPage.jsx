import React from "react";
import {
    Alert,
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    Divider,
    Grid,
    InputAdornment,
    MenuItem,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import SearchIcon from "@mui/icons-material/Search";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import { useSchool } from "../../../contexts/SchoolContext.jsx";
import { getSchoolFavouriteParents, getParentStudentDetailById } from "../../../services/SchoolService.jsx";
import { getApiErrorMessage } from "../../../utils/getApiErrorMessage.js";

const toGenderLabel = (value) => {
    const v = String(value || "").toUpperCase();
    if (v === "MALE") return "Nam";
    if (v === "FEMALE") return "Nữ";
    return "-";
};

const toRelationshipLabel = (value) => {
    const v = String(value || "").toUpperCase();
    if (v === "FATHER") return "Cha";
    if (v === "MOTHER") return "Mẹ";
    if (v === "GUARDIAN") return "Người giám hộ";
    return String(value || "-");
};

const normalizeChildren = (parent) => {
    const children = Array.isArray(parent?.children) ? parent.children : [];
    return children.map((child, index) => ({
        id: child?.id ?? `child-${parent?.id ?? "unknown"}-${index}`,
        name: String(child?.name || "Học sinh chưa có tên"),
        gender: child?.gender || "",
    }));
};

const getInitials = (name) =>
    String(name || "")
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .slice(-2)
        .join("")
        .toUpperCase() || "PH";

const toSubjectTypeLabel = (value) => {
    const v = String(value || "").toLowerCase();
    if (v === "regular") return "Môn chính";
    if (v === "foreign_language") return "Ngoại ngữ";
    return String(value || "-");
};

const getScoreTone = (score, isAvailable) => {
    if (!isAvailable) {
        return { label: "N/A", bg: "#f1f5f9", color: "#64748b", border: "#e2e8f0" };
    }

    const numeric = Number(score);
    if (!Number.isFinite(numeric)) {
        return { label: "-", bg: "#f1f5f9", color: "#64748b", border: "#e2e8f0" };
    }

    if (numeric >= 8) return { label: String(numeric), bg: "#dcfce7", color: "#166534", border: "#86efac" };
    if (numeric >= 6.5) return { label: String(numeric), bg: "#dbeafe", color: "#1d4ed8", border: "#93c5fd" };
    if (numeric >= 5) return { label: String(numeric), bg: "#fef3c7", color: "#a16207", border: "#fcd34d" };
    return { label: String(numeric), bg: "#fee2e2", color: "#b91c1c", border: "#fca5a5" };
};

export default function SchoolParentsInterestPage() {
    const { isPrimaryBranch, loading: schoolCtxLoading } = useSchool();

    const [parents, setParents] = React.useState([]);
    const [loadingParents, setLoadingParents] = React.useState(false);
    const [parentsError, setParentsError] = React.useState("");

    const [parentSearch, setParentSearch] = React.useState("");
    const [relationshipFilter, setRelationshipFilter] = React.useState("ALL");
    const [childGenderFilter, setChildGenderFilter] = React.useState("ALL");
    const [parentPage, setParentPage] = React.useState(0);
    const [parentRowsPerPage, setParentRowsPerPage] = React.useState(10);

    const [detailOpen, setDetailOpen] = React.useState(false);
    const [selectedChild, setSelectedChild] = React.useState(null);
    const [detailLoading, setDetailLoading] = React.useState(false);
    const [detailError, setDetailError] = React.useState("");
    const [studentDetail, setStudentDetail] = React.useState(null);
    const [childrenDialogOpen, setChildrenDialogOpen] = React.useState(false);
    const [selectedParentRow, setSelectedParentRow] = React.useState(null);

    React.useEffect(() => {
        let cancelled = false;

        if (schoolCtxLoading || !isPrimaryBranch) {
            setParents([]);
            setParentsError("");
            return undefined;
        }

        const loadParents = async () => {
            setLoadingParents(true);
            setParentsError("");
            try {
                const list = await getSchoolFavouriteParents();
                if (!cancelled) {
                    setParents(Array.isArray(list) ? list : []);
                }
            } catch (error) {
                if (!cancelled) {
                    setParents([]);
                    setParentsError(getApiErrorMessage(error, "Không tải được danh sách phụ huynh quan tâm trường."));
                }
            } finally {
                if (!cancelled) setLoadingParents(false);
            }
        };

        loadParents();

        return () => {
            cancelled = true;
        };
    }, [isPrimaryBranch, schoolCtxLoading]);

    const parentRows = React.useMemo(() => {
        return (Array.isArray(parents) ? parents : []).map((parent) => ({
            ...parent,
            normalizedChildren: normalizeChildren(parent),
        }));
    }, [parents]);

    const filteredParentRows = React.useMemo(() => {
        const keyword = String(parentSearch || "").trim().toLowerCase();

        return parentRows.filter((parent) => {
            const relationshipMatched =
                relationshipFilter === "ALL" || String(parent?.relationship || "").toUpperCase() === relationshipFilter;

            const children = Array.isArray(parent?.normalizedChildren) ? parent.normalizedChildren : [];
            const childGenderMatched =
                childGenderFilter === "ALL" ||
                children.some((child) => String(child?.gender || "").toUpperCase() === childGenderFilter);

            if (!relationshipMatched || !childGenderMatched) return false;

            if (!keyword) return true;

            const haystacks = [
                parent?.name,
                parent?.phone,
                parent?.workplace,
                parent?.currentAddress,
                parent?.occupation,
                ...children.map((child) => child?.name),
            ]
                .filter(Boolean)
                .map((value) => String(value).toLowerCase());

            return haystacks.some((value) => value.includes(keyword));
        });
    }, [parentRows, parentSearch, relationshipFilter, childGenderFilter]);

    React.useEffect(() => {
        setParentPage(0);
    }, [parentSearch, relationshipFilter, childGenderFilter]);

    React.useEffect(() => {
        const maxPage = Math.max(0, Math.ceil(filteredParentRows.length / parentRowsPerPage) - 1);
        if (parentPage > maxPage) {
            setParentPage(maxPage);
        }
    }, [filteredParentRows.length, parentPage, parentRowsPerPage]);

    const pagedParentRows = React.useMemo(() => {
        const start = parentPage * parentRowsPerPage;
        return filteredParentRows.slice(start, start + parentRowsPerPage);
    }, [filteredParentRows, parentPage, parentRowsPerPage]);

    const handleOpenChildDetail = async (parent, child) => {
        setSelectedChild({
            id: child?.id,
            name: child?.name,
            parentName: parent?.name,
        });
        setStudentDetail(null);
        setDetailError("");
        setDetailLoading(true);
        setDetailOpen(true);

        try {
            const detail = await getParentStudentDetailById(child?.id);
            setStudentDetail(detail);
        } catch (error) {
            setDetailError(getApiErrorMessage(error, "Không tải được hồ sơ học sinh."));
        } finally {
            setDetailLoading(false);
        }
    };

    const handleCloseDetail = () => {
        setDetailOpen(false);
        setSelectedChild(null);
        setStudentDetail(null);
        setDetailError("");
        setDetailLoading(false);
    };

    const handleOpenChildrenDialog = (parent) => {
        setSelectedParentRow(parent);
        setChildrenDialogOpen(true);
    };

    const handleCloseChildrenDialog = () => {
        setChildrenDialogOpen(false);
        setSelectedParentRow(null);
    };

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, pb: 4 }}>
            <Card
                elevation={0}
                sx={{
                    borderRadius: 4,
                    border: "1px solid #dbeafe",
                    bgcolor: "#ffffff",
                    boxShadow: "0 14px 36px rgba(30, 64, 175, 0.08)",
                    overflow: "hidden",
                }}
            >
                <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.4}>
                        <Stack direction="row" spacing={1.2} alignItems="center">
                            <Box
                                sx={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: 2,
                                    bgcolor: "#dbeafe",
                                    color: "#1d4ed8",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <PeopleAltIcon sx={{ fontSize: 22 }} />
                            </Box>
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a" }}>
                                    Danh sách phụ huynh quan tâm trường
                                </Typography>
                                <Typography variant="caption" sx={{ color: "#475569", fontWeight: 600 }}>
                                    Trang theo dõi chi tiết và lọc nâng cao
                                </Typography>
                            </Box>
                        </Stack>
                        <Chip
                            size="small"
                            label={`${filteredParentRows.length} hồ sơ`}
                            sx={{ borderRadius: 999, bgcolor: "#eff6ff", color: "#1d4ed8", fontWeight: 700 }}
                        />
                    </Stack>

                    {schoolCtxLoading ? (
                        <Stack direction="row" spacing={1.2} alignItems="center" sx={{ py: 2 }}>
                            <CircularProgress size={20} />
                            <Typography variant="body2" sx={{ color: "#64748b" }}>
                                Đang xác định quyền campus...
                            </Typography>
                        </Stack>
                    ) : !isPrimaryBranch ? (
                        <Alert severity="info" sx={{ borderRadius: 2 }}>
                            Chỉ campus chính mới được xem danh sách phụ huynh quan tâm trường.
                        </Alert>
                    ) : (
                        <>
                            <Stack spacing={1.5} sx={{ mb: 2.2, p: 1.5, border: "1px solid #dbeafe", borderRadius: 2.5, bgcolor: "rgba(248,250,252,0.8)" }}>
                                <Grid container spacing={1.2}>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            fullWidth
                                            size="small"
                                            value={parentSearch}
                                            onChange={(e) => setParentSearch(e.target.value)}
                                            placeholder="Tìm theo tên phụ huynh, SĐT, tên học sinh..."
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <SearchIcon sx={{ fontSize: 18, color: "#64748b" }} />
                                                    </InputAdornment>
                                                ),
                                            }}
                                            sx={{
                                                "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#ffffff" },
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <TextField
                                            select
                                            fullWidth
                                            size="small"
                                            label="Quan hệ"
                                            value={relationshipFilter}
                                            onChange={(e) => setRelationshipFilter(e.target.value)}
                                            sx={{
                                                "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#ffffff" },
                                            }}
                                        >
                                            <MenuItem value="ALL">Tất cả</MenuItem>
                                            <MenuItem value="FATHER">Cha</MenuItem>
                                            <MenuItem value="MOTHER">Mẹ</MenuItem>
                                            <MenuItem value="GUARDIAN">Giám hộ</MenuItem>
                                        </TextField>
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <TextField
                                            select
                                            fullWidth
                                            size="small"
                                            label="Giới tính học sinh"
                                            value={childGenderFilter}
                                            onChange={(e) => setChildGenderFilter(e.target.value)}
                                            sx={{
                                                "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#ffffff" },
                                            }}
                                        >
                                            <MenuItem value="ALL">Tất cả</MenuItem>
                                            <MenuItem value="MALE">Nam</MenuItem>
                                            <MenuItem value="FEMALE">Nữ</MenuItem>
                                        </TextField>
                                    </Grid>
                                </Grid>
                                <Typography variant="caption" sx={{ color: "#334155", fontWeight: 700 }}>
                                    {`Hiển thị ${pagedParentRows.length}/${filteredParentRows.length} phụ huynh phù hợp`}
                                </Typography>
                            </Stack>

                            {loadingParents ? (
                                <Stack direction="row" spacing={1.2} alignItems="center" sx={{ py: 2 }}>
                                    <CircularProgress size={20} />
                                    <Typography variant="body2" sx={{ color: "#64748b" }}>
                                        Đang tải danh sách phụ huynh...
                                    </Typography>
                                </Stack>
                            ) : parentsError ? (
                                <Alert severity="error" sx={{ borderRadius: 2 }}>
                                    {parentsError}
                                </Alert>
                            ) : filteredParentRows.length === 0 ? (
                                <Alert severity="info" sx={{ borderRadius: 2 }}>
                                    Không có phụ huynh phù hợp với bộ lọc hiện tại.
                                </Alert>
                            ) : (
                                <>
                                    <TableContainer sx={{ border: "1px solid #e2e8f0", borderRadius: 2.5, bgcolor: "#fff" }}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow sx={{ bgcolor: "#f1f5f9" }}>
                                                    <TableCell sx={{ fontWeight: 700, color: "#1e293b", minWidth: 210 }}>Phụ huynh</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, color: "#1e293b", minWidth: 140 }}>Liên hệ</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, color: "#1e293b", minWidth: 170 }}>CCCD/CMND</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, color: "#1e293b", minWidth: 170 }}>Nghề nghiệp</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, color: "#1e293b", minWidth: 150 }}>Nơi làm việc</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, color: "#1e293b", minWidth: 220 }}>Địa chỉ hiện tại</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, color: "#1e293b", minWidth: 210 }}>Xem hồ sơ học sinh</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {pagedParentRows.map((parent) => (
                                                    <TableRow
                                                        key={String(parent.id ?? parent.phone ?? parent.name)}
                                                        hover
                                                        sx={{
                                                            "& td": { borderColor: "#e2e8f0", verticalAlign: "top" },
                                                            "&:hover": { bgcolor: "#f8fbff" },
                                                        }}
                                                    >
                                                        <TableCell>
                                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                                <Avatar
                                                                    src={parent.avatar || undefined}
                                                                    sx={{ width: 32, height: 32, bgcolor: "#0D64DE", fontSize: 14 }}
                                                                >
                                                                    {getInitials(parent.name)}
                                                                </Avatar>
                                                                <Box>
                                                                    <Typography sx={{ fontWeight: 700, color: "#1e293b" }}>
                                                                        {parent.name || "Chưa có tên"}
                                                                    </Typography>
                                                                    <Typography variant="caption" sx={{ color: "#64748b" }}>
                                                                        {toRelationshipLabel(parent.relationship)} · {toGenderLabel(parent.gender)}
                                                                    </Typography>
                                                                </Box>
                                                            </Stack>
                                                        </TableCell>

                                                        <TableCell>
                                                            <Typography variant="body2" sx={{ color: "#1e293b", fontWeight: 500 }}>
                                                                {parent.phone || "-"}
                                                            </Typography>
                                                        </TableCell>

                                                        <TableCell>
                                                            <Chip
                                                                size="small"
                                                                label={parent.idCardNumber || "-"}
                                                                sx={{
                                                                    borderRadius: 999,
                                                                    bgcolor: "#fefce8",
                                                                    color: "#854d0e",
                                                                    border: "1px solid #fde68a",
                                                                    fontWeight: 700,
                                                                }}
                                                            />
                                                        </TableCell>

                                                        <TableCell>
                                                            <Typography variant="body2" sx={{ color: "#1e293b" }}>
                                                                {parent.occupation || "-"}
                                                            </Typography>
                                                        </TableCell>

                                                        <TableCell>
                                                            <Typography variant="body2" sx={{ color: "#1e293b" }}>
                                                                {parent.workplace || "-"}
                                                            </Typography>
                                                        </TableCell>

                                                        <TableCell>
                                                            <Typography variant="body2" sx={{ color: "#334155" }}>
                                                                {parent.currentAddress || "-"}
                                                            </Typography>
                                                        </TableCell>

                                                        <TableCell>
                                                            <Stack spacing={0.7}>
                                                                <Chip
                                                                    size="small"
                                                                    label={`${parent.normalizedChildren.length} học sinh`}
                                                                    sx={{
                                                                        alignSelf: "flex-start",
                                                                        borderRadius: 999,
                                                                        bgcolor: "#ecfdf5",
                                                                        color: "#166534",
                                                                        border: "1px solid #86efac",
                                                                        fontWeight: 700,
                                                                    }}
                                                                />
                                                                {parent.normalizedChildren.length === 0 ? (
                                                                    <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                                                                        Không có dữ liệu học sinh
                                                                    </Typography>
                                                                ) : (
                                                                    <Button
                                                                        size="small"
                                                                        variant="outlined"
                                                                        startIcon={<VisibilityOutlinedIcon />}
                                                                        onClick={() => handleOpenChildrenDialog(parent)}
                                                                        sx={{
                                                                            justifyContent: "flex-start",
                                                                            textTransform: "none",
                                                                            borderRadius: 999,
                                                                            borderColor: "#bfdbfe",
                                                                            color: "#1e3a8a",
                                                                            fontWeight: 700,
                                                                            px: 1.6,
                                                                            width: "fit-content",
                                                                            "&:hover": {
                                                                                borderColor: "#2563eb",
                                                                                bgcolor: "#eff6ff",
                                                                                transform: "translateY(-1px)",
                                                                            },
                                                                        }}
                                                                    >
                                                                        {parent.normalizedChildren.length === 1
                                                                            ? `Xem hồ sơ: ${parent.normalizedChildren[0]?.name || "Học sinh"}`
                                                                            : `Xem danh sách hồ sơ (${parent.normalizedChildren.length})`}
                                                                    </Button>
                                                                )}
                                                            </Stack>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>

                                    <TablePagination
                                        component="div"
                                        rowsPerPageOptions={[10, 20, 50]}
                                        count={filteredParentRows.length}
                                        rowsPerPage={parentRowsPerPage}
                                        page={parentPage}
                                        onPageChange={(_, page) => setParentPage(page)}
                                        onRowsPerPageChange={(event) => {
                                            setParentRowsPerPage(Number(event.target.value));
                                            setParentPage(0);
                                        }}
                                        labelRowsPerPage="Hiển thị"
                                        labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
                                        sx={{
                                            mt: 0.8,
                                            border: "1px solid #e2e8f0",
                                            borderRadius: 2,
                                            bgcolor: "#ffffff",
                                        }}
                                    />
                                </>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            <Dialog
                open={detailOpen}
                onClose={handleCloseDetail}
                maxWidth="lg"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        overflow: "hidden",
                        border: "1px solid #dbeafe",
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        pb: 1.4,
                        background: "linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)",
                        borderBottom: "1px solid #e2e8f0",
                    }}
                >
                    <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a", letterSpacing: "-0.01em" }}>
                        {`Chi tiết hồ sơ học sinh${selectedChild?.name ? ` - ${selectedChild.name}` : ""}`}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>
                        Student profile + academic profile
                    </Typography>
                </DialogTitle>
                <DialogContent dividers>
                    {detailLoading ? (
                        <Stack direction="row" spacing={1.2} alignItems="center" sx={{ py: 2 }}>
                            <CircularProgress size={20} />
                            <Typography variant="body2" sx={{ color: "#64748b" }}>
                                Đang tải chi tiết hồ sơ học sinh...
                            </Typography>
                        </Stack>
                    ) : detailError ? (
                        <Alert severity="error" sx={{ borderRadius: 2 }}>
                            {detailError}
                        </Alert>
                    ) : !studentDetail ? (
                        <Alert severity="info" sx={{ borderRadius: 2 }}>
                            Không có dữ liệu hồ sơ học sinh.
                        </Alert>
                    ) : (
                        <Stack spacing={2.2}>
                            <Box sx={{ p: 1.6, border: "1px solid #dbeafe", borderRadius: 2.5, bgcolor: "#f8fbff" }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#0f172a", mb: 1.2 }}>
                                    Student Profile
                                </Typography>
                                <Grid container spacing={1.5}>
                                    <Grid item xs={12} md={6}>
                                        <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: "#ffffff", border: "1px solid #e2e8f0" }}>
                                            <Typography variant="body2" sx={{ color: "#64748b" }}>Học sinh</Typography>
                                            <Typography sx={{ fontWeight: 700, color: "#1e293b" }}>
                                                {studentDetail.studentName || selectedChild?.name || "-"}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: "#ffffff", border: "1px solid #e2e8f0" }}>
                                            <Typography variant="body2" sx={{ color: "#64748b" }}>Giới tính</Typography>
                                            <Typography sx={{ fontWeight: 700, color: "#1e293b" }}>
                                                {toGenderLabel(studentDetail.gender)}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: "#ffffff", border: "1px solid #e2e8f0" }}>
                                            <Typography variant="body2" sx={{ color: "#64748b" }}>Tính cách</Typography>
                                            <Typography sx={{ fontWeight: 700, color: "#1e293b" }}>
                                                {studentDetail.personalityTypeCode || studentDetail.personalityCode || "-"}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: "#ffffff", border: "1px solid #e2e8f0" }}>
                                            <Typography variant="body2" sx={{ color: "#64748b" }}>Ngành yêu thích</Typography>
                                            <Typography sx={{ fontWeight: 700, color: "#1e293b" }}>
                                                {studentDetail.favouriteJob || "-"}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                </Grid>
                                {Array.isArray(studentDetail.traits) && studentDetail.traits.length > 0 ? (
                                    <Stack direction="row" spacing={1} sx={{ mt: 1.4, flexWrap: "wrap", rowGap: 1 }}>
                                        {studentDetail.traits.map((trait, traitIndex) => (
                                            <Chip
                                                key={`${String(trait?.name || "trait")}-${traitIndex}`}
                                                label={String(trait?.name || "Trait")}
                                                sx={{ bgcolor: "#e0e7ff", color: "#3730a3", border: "1px solid #c7d2fe" }}
                                            />
                                        ))}
                                    </Stack>
                                ) : null}
                            </Box>

                            <Divider />

                            <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#0f172a", mb: 1.2 }}>
                                    Academic Profile
                                </Typography>

                                {Array.isArray(studentDetail.academicProfileMetadata) &&
                                studentDetail.academicProfileMetadata.length > 0 ? (
                                    <Stack spacing={1.5}>
                                        {studentDetail.academicProfileMetadata.map((gradeMeta, index) => {
                                            const subjects = Array.isArray(gradeMeta?.subjectResults)
                                                ? gradeMeta.subjectResults
                                                : [];
                                            const gradeLabel = String(gradeMeta?.gradeLevel || `GRADE_${index + 1}`);

                                            return (
                                                <Card
                                                    key={`${gradeLabel}-${index}`}
                                                    elevation={0}
                                                    sx={{ border: "1px solid #166534", borderRadius: 2.5, overflow: "hidden" }}
                                                >
                                                    <CardContent sx={{ p: 0 }}>
                                                        <Box sx={{ px: 2, py: 1.4, bgcolor: "#dcfce7", borderBottom: "1px solid #166534" }}>
                                                            <Typography sx={{ fontWeight: 800, color: "#166534" }}>
                                                                {gradeLabel}
                                                            </Typography>
                                                        </Box>
                                                        <Box sx={{ p: 1.2 }}>
                                                            <Table size="small" sx={{ "& .MuiTableCell-root": { borderColor: "#166534" } }}>
                                                                <TableHead>
                                                                    <TableRow sx={{ bgcolor: "#166534" }}>
                                                                        <TableCell sx={{ fontWeight: 700, color: "#ffffff" }}>Môn học</TableCell>
                                                                        <TableCell sx={{ fontWeight: 700, color: "#ffffff" }}>Loại</TableCell>
                                                                        <TableCell sx={{ fontWeight: 700, color: "#ffffff" }}>Điểm</TableCell>
                                                                    </TableRow>
                                                                </TableHead>
                                                                <TableBody>
                                                                    {subjects.length === 0 ? (
                                                                        <TableRow>
                                                                            <TableCell colSpan={3} sx={{ color: "#64748b" }}>
                                                                                Chưa có dữ liệu điểm
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ) : (
                                                                        subjects.map((subject, subjectIndex) => {
                                                                            const tone = getScoreTone(subject?.score, subject?.isAvailable);

                                                                            return (
                                                                                <TableRow
                                                                                    key={String(subject?.id ?? `${subject?.name}-${subject?.type}`)}
                                                                                    sx={{ bgcolor: subjectIndex % 2 === 0 ? "#ffffff" : "#f0fdf4" }}
                                                                                >
                                                                                    <TableCell sx={{ fontWeight: 600, color: "#1e293b" }}>
                                                                                        {subject?.name || "-"}
                                                                                    </TableCell>
                                                                                    <TableCell>
                                                                                        <Chip
                                                                                            size="small"
                                                                                            label={toSubjectTypeLabel(subject?.type)}
                                                                                            sx={{
                                                                                                borderRadius: 999,
                                                                                                bgcolor: "#f1f5f9",
                                                                                                color: "#334155",
                                                                                                border: "1px solid #e2e8f0",
                                                                                            }}
                                                                                        />
                                                                                    </TableCell>
                                                                                    <TableCell>
                                                                                        <Box
                                                                                            sx={{
                                                                                                display: "inline-flex",
                                                                                                minWidth: 38,
                                                                                                px: 1,
                                                                                                py: 0.25,
                                                                                                borderRadius: 999,
                                                                                                border: `1px solid ${tone.border}`,
                                                                                                bgcolor: tone.bg,
                                                                                                color: tone.color,
                                                                                                fontWeight: 800,
                                                                                                justifyContent: "center",
                                                                                            }}
                                                                                        >
                                                                                            {tone.label}
                                                                                        </Box>
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            );
                                                                        })
                                                                    )}
                                                                </TableBody>
                                                            </Table>
                                                        </Box>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </Stack>
                                ) : (
                                    <Typography variant="body2" sx={{ color: "#64748b" }}>
                                        Chưa có dữ liệu học tập.
                                    </Typography>
                                )}
                            </Box>

                            <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#0f172a", mb: 1.2 }}>
                                    Transcript Images
                                </Typography>

                                {Array.isArray(studentDetail.transcriptImages) && studentDetail.transcriptImages.length > 0 ? (
                                    <Grid container spacing={1.2}>
                                        {studentDetail.transcriptImages.map((image, idx) => (
                                            <Grid item xs={12} md={6} key={`${String(image?.grade || "grade")}-${idx}`}>
                                                <Card elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: 2.2, overflow: "hidden" }}>
                                                    <Box
                                                        sx={{
                                                            height: 132,
                                                            bgcolor: "#f8fafc",
                                                            borderBottom: "1px solid #e2e8f0",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            overflow: "hidden",
                                                        }}
                                                    >
                                                        {image?.imageUrl ? (
                                                            <Box
                                                                component="img"
                                                                src={image.imageUrl}
                                                                alt={String(image?.grade || "Transcript")}
                                                                sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                                                            />
                                                        ) : (
                                                            <Typography variant="caption" sx={{ color: "#64748b" }}>Không có ảnh</Typography>
                                                        )}
                                                    </Box>
                                                    <CardContent sx={{ p: 1.2 }}>
                                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                            <Typography variant="body2" sx={{ fontWeight: 700, color: "#1e293b" }}>
                                                                {image?.grade || "Không rõ khối"}
                                                            </Typography>
                                                            <Button
                                                                component="a"
                                                                href={image?.imageUrl || "#"}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                size="small"
                                                                variant="outlined"
                                                                disabled={!image?.imageUrl}
                                                                sx={{ textTransform: "none", borderRadius: 999 }}
                                                            >
                                                                Xem ảnh
                                                            </Button>
                                                        </Stack>
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                        ))}
                                    </Grid>
                                ) : (
                                    <Typography variant="body2" sx={{ color: "#64748b" }}>
                                        Chưa có ảnh học bạ.
                                    </Typography>
                                )}
                            </Box>
                        </Stack>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog
                open={childrenDialogOpen}
                onClose={handleCloseChildrenDialog}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        overflow: "hidden",
                        border: "1px solid #dbeafe",
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        pb: 1.4,
                        background: "linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)",
                        borderBottom: "1px solid #e2e8f0",
                    }}
                >
                    <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a" }}>
                        Hồ sơ học sinh của {selectedParentRow?.name || "phụ huynh"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>
                        Chọn một hồ sơ để xem chi tiết
                    </Typography>
                </DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={1.2}>
                        {Array.isArray(selectedParentRow?.normalizedChildren) && selectedParentRow.normalizedChildren.length > 0 ? (
                            selectedParentRow.normalizedChildren.map((child) => (
                                <Card key={String(child.id)} elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: 2.2 }}>
                                    <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.5}>
                                            <Box>
                                                <Typography sx={{ fontWeight: 700, color: "#1e293b" }}>
                                                    {child.name}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: "#64748b" }}>
                                                    {toGenderLabel(child.gender)}
                                                </Typography>
                                            </Box>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                startIcon={<VisibilityOutlinedIcon />}
                                                onClick={() => {
                                                    handleCloseChildrenDialog();
                                                    handleOpenChildDetail(selectedParentRow, child);
                                                }}
                                                sx={{
                                                    textTransform: "none",
                                                    borderRadius: 999,
                                                    borderColor: "#bfdbfe",
                                                    color: "#1e3a8a",
                                                    fontWeight: 700,
                                                }}
                                            >
                                                Xem chi tiết
                                            </Button>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <Alert severity="info" sx={{ borderRadius: 2 }}>
                                Phụ huynh này chưa có hồ sơ học sinh.
                            </Alert>
                        )}
                    </Stack>
                </DialogContent>
            </Dialog>
        </Box>
    );
}
